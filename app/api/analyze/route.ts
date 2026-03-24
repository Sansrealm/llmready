import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { getUserSubscription, incrementAnalysisCount } from '@/lib/auth-utils';
import { saveAnalysis, getAnalysisByUrl, captureGuestEmail } from '@/lib/db';
import { AnalysisResult, AnalysisRequest, QueryBucket } from '@/lib/types';

// Anthropic client — used for website scoring (independent of measured models)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Main route handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Get user subscription info using centralized utility
    const subscription = await getUserSubscription();

    console.log(`🔐 User authentication status: ${
      subscription.isAuthenticated
        ? subscription.isPremium
          ? `Premium (${subscription.analysisCount}/${subscription.limit})`
          : `Free (${subscription.analysisCount}/${subscription.limit})`
        : 'Guest'
    }`);

    // Get request data
    const requestData = await request.json() as AnalysisRequest;
    const { url, email, industry } = requestData;

    // 1. Validate URL — return 400 immediately if malformed
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // 2. Check for cached analysis if requested
    const searchParams = request.nextUrl.searchParams;
    const useCached = searchParams.get('cached') === 'true';

    if (useCached && subscription.isAuthenticated && subscription.userId) {
      try {
        const cachedAnalysis = await getAnalysisByUrl(subscription.userId, url);

        if (cachedAnalysis) {
          const cacheAge = Date.now() - new Date(cachedAnalysis.analyzed_at).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;

          if (cacheAge < oneDayMs) {
            console.log(`✅ Returning cached analysis (age: ${Math.floor(cacheAge / 1000 / 60)} minutes)`);

            const analysisResult: AnalysisResult = {
              overall_score: cachedAnalysis.overall_score,
              parameters: cachedAnalysis.parameters,
              recommendations: cachedAnalysis.recommendations ?? [],
            };

            if (!subscription.isPremium) {
              analysisResult.remainingAnalyses = subscription.remainingAnalyses;
            }

            // Forward query buckets from cache
            if (cachedAnalysis.query_buckets != null) {
              analysisResult.queryBuckets = cachedAnalysis.query_buckets;
              analysisResult.visibilityQueries = cachedAnalysis.query_buckets.map((q) => q.query);
            }

            return NextResponse.json({
              id: cachedAnalysis.id,
              ...analysisResult,
              cached: true,
              analyzed_at: cachedAnalysis.analyzed_at,
            });
          } else {
            console.log(`⏰ Cached analysis too old (${Math.floor(cacheAge / 1000 / 60 / 60)} hours), generating fresh`);
          }
        }
      } catch (cacheError) {
        console.error('⚠️ Cache lookup failed, continuing with fresh analysis:', cacheError);
      }
    }

    // 3. Check if authenticated user can analyze
    if (subscription.isAuthenticated && !subscription.canAnalyze) {
      const upgradeMessage = subscription.isPremium
        ? `You've reached the premium analysis limit (${subscription.limit} analyses). Please contact support for higher limits.`
        : `You've reached the maximum number of analyses for free users (${subscription.limit}). Please upgrade to Premium for more analyses.`;

      return NextResponse.json(
        { error: upgradeMessage },
        { status: 403 }
      );
    }

    // 4. Fetch website content
    const response = await fetch(url);
    const html = await response.text();

    // 5. Parse HTML
    const $ = cheerio.load(html);
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const headings = $('h1, h2, h3').map((i, el) => $(el).text()).get();
    const paragraphs = $('p').map((i, el) => $(el).text()).get().slice(0, 10);
    const hasSchema = $('script[type="application/ld+json"]').length > 0;
    const hasMobileViewport = $('meta[name="viewport"]').length > 0;
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;

    // 6. OpenAI prompt
    const showPremiumContent = !subscription.isAuthenticated || subscription.isPremium;
    const analysisPrompt = `
      Analyze this website for LLM readiness:
      URL: ${url}
      Title: ${title}
      Meta Description: ${metaDescription}
      Headings: ${headings.join(', ')}
      Content Sample: ${paragraphs.join(' ').substring(0, 1000)}
      Has Schema Markup: ${hasSchema}
      Has Mobile Viewport: ${hasMobileViewport}
      Images: ${images}, With Alt Text: ${imagesWithAlt}

      Provide an analysis of how well this website is optimized for Large Language Models (LLMs).
      Also classify the site's industry as one of: ecommerce, saas, media, education, healthcare, other.

      Score each parameter using this exact scale:
      0  = completely absent or broken
      25 = present but ineffective
      50 = functional but below best practice
      75 = good, meets most best practice criteria
      100 = exceptional, optimised for LLM retrieval
      Score conservatively. Do not assign 100 unless the criterion is genuinely best-in-class.

      Generate 20 search queries a potential customer might type into ChatGPT or Perplexity
      when looking for this product/service, organised into 4 typed buckets of 5 queries each:
      - brand: queries that include the brand name or site name
      - problem: queries describing the problem this product/service solves
      - category: queries about the product/service category
      - comparison: queries comparing this product/service against alternatives

      Return a JSON object with this shape:

      {
        "overall_score": (0-100),
        "parameters": [
          { "name": "...", "score": 0-100, "isPremium": ${!showPremiumContent}, "description": "..." }
        ],
        "recommendations": [
          { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": ${!showPremiumContent} }
        ],
        "industry": "ecommerce|saas|media|education|healthcare|other",
        "query_buckets": [
          { "query": "...", "type": "brand" },
          { "query": "...", "type": "brand" },
          { "query": "...", "type": "brand" },
          { "query": "...", "type": "brand" },
          { "query": "...", "type": "brand" },
          { "query": "...", "type": "problem" },
          { "query": "...", "type": "problem" },
          { "query": "...", "type": "problem" },
          { "query": "...", "type": "problem" },
          { "query": "...", "type": "problem" },
          { "query": "...", "type": "category" },
          { "query": "...", "type": "category" },
          { "query": "...", "type": "category" },
          { "query": "...", "type": "category" },
          { "query": "...", "type": "category" },
          { "query": "...", "type": "comparison" },
          { "query": "...", "type": "comparison" },
          { "query": "...", "type": "comparison" },
          { "query": "...", "type": "comparison" },
          { "query": "...", "type": "comparison" }
        ]
      }
    `;

    // 7. Call Claude for scoring (independent of the three models being measured)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: 'You are an expert in SEO, GEO (Generative Engine Optimization), and LLM citation analysis. Return only valid JSON — no markdown, no explanation, no code fences.',
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : '';
    // Strip markdown fences if present
    const raw = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    console.log('🧠 Claude response received');

    // 8. Parse and validate response
    let analysisResult: AnalysisResult;
    try {
      const parsed = JSON.parse(raw || '{}');
      if (
        typeof parsed !== 'object' ||
        typeof parsed.overall_score !== 'number' ||
        !Array.isArray(parsed.parameters) ||
        !Array.isArray(parsed.recommendations)
      ) {
        throw new Error('Invalid analysis structure');
      }
      analysisResult = parsed as AnalysisResult;

      // Clamp scores to valid 0–100 integer range
      analysisResult.overall_score = Math.round(Math.max(0, Math.min(100, analysisResult.overall_score)));
      analysisResult.parameters = analysisResult.parameters.map(p => ({
        ...p,
        score: Math.round(Math.max(0, Math.min(100, p.score))),
      }));

      // Extract GPT-detected industry
      if (typeof parsed.industry === 'string' && parsed.industry) {
        analysisResult.industry = parsed.industry;
      }

      // Extract typed query buckets and derive flat visibilityQueries for backward compat
      if (Array.isArray(parsed.query_buckets) && parsed.query_buckets.length > 0) {
        analysisResult.queryBuckets = parsed.query_buckets as QueryBucket[];
        analysisResult.visibilityQueries = parsed.query_buckets.map(
          (q: QueryBucket) => q.query
        );
      }
    } catch (err) {
      console.error('❌ JSON parse or structure error:', err);
      return NextResponse.json(
        { error: 'Invalid JSON from Claude', raw },
        { status: 500 }
      );
    }

    // 9. Increment analysis count ONLY after successful analysis
    if (subscription.isAuthenticated && subscription.userId) {
      try {
        const newCount = await incrementAnalysisCount(subscription.userId);
        const newRemaining = Math.max(0, subscription.limit - newCount);

        if (!subscription.isPremium) {
          analysisResult.remainingAnalyses = newRemaining;
        }

        console.log(`✅ Analysis count updated: ${subscription.analysisCount} → ${newCount} (remaining: ${newRemaining})`);
      } catch (countError) {
        console.error('⚠️ Failed to increment analysis count:', countError);
      }
    }

    // 11. Save analysis to database (only for authenticated users)
    if (subscription.isAuthenticated && subscription.userId) {
      try {
        const savedAnalysis = await saveAnalysis({
          userId: subscription.userId,
          url: url,
          overallScore: analysisResult.overall_score,
          parameters: analysisResult.parameters,
          recommendations: analysisResult.recommendations ?? null,
          queryBuckets: analysisResult.queryBuckets ?? null,
        });
        console.log('✅ Analysis saved to database');
        analysisResult.id = savedAnalysis.id;
      } catch (dbError) {
        console.error('❌ Failed to save analysis to database:', dbError);
      }
    }

    // 12. Capture guest email if provided
    if (!subscription.isAuthenticated && email) {
      try {
        await captureGuestEmail(email);
        console.log('✅ Guest email captured for outreach');
      } catch (emailError) {
        console.error('⚠️ Failed to capture guest email:', emailError);
      }
    }

    return NextResponse.json({
      ...analysisResult,
      analyzed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🔥 Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to analyze website', message: errorMessage },
      { status: 500 }
    );
  }
}
