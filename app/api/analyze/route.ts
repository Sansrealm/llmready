import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { getUserSubscription, incrementAnalysisCount } from '@/lib/auth-utils';
import { saveAnalysis, getAnalysisByUrl, captureGuestEmail } from '@/lib/db';
import { AnalysisResult, AnalysisRequest, QueryBucket, CitationResult, CitationGap } from '@/lib/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── Citation intelligence helper ───────────────────────────────────────────────

async function runCitationChecks(
  queryBuckets: QueryBucket[],
  targetDomain: string
): Promise<{
  citationResults: CitationResult[];
  citationGaps: CitationGap[];
  citationRate: number | null;
  citationDataQuality: 'sufficient' | 'insufficient';
}> {
  const perplexity = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai',
  });

  // Fire all queries in parallel — never throw, always resolve
  const settled = await Promise.allSettled(
    queryBuckets.map(async (bucket) => {
      const response = await perplexity.chat.completions.create({
        model: 'sonar',
        messages: [{ role: 'user', content: bucket.query }],
        max_tokens: 400,
      });
      const citations =
        (response as unknown as { citations?: string[] }).citations ?? [];
      return { bucket, citations };
    })
  );

  const citationResults: CitationResult[] = settled.map((outcome, i) => {
    const bucket = queryBuckets[i];

    if (outcome.status === 'rejected') {
      return {
        query: bucket.query,
        query_type: bucket.type,
        cited: false,
        citation_position: null,
        competing_domains: [],
        perplexity_status: 'api_error' as const,
      };
    }

    const { citations } = outcome.value;

    // Find position of target domain in citations list
    let citationPosition: number | null = null;
    const competingDomains: string[] = [];

    for (let idx = 0; idx < citations.length; idx++) {
      const citUrl = citations[idx];
      let hostname: string;
      try {
        hostname = new URL(citUrl).hostname.replace(/^www\./, '');
      } catch {
        continue;
      }

      if (hostname === targetDomain) {
        if (citationPosition === null) {
          citationPosition = idx + 1; // 1-based
        }
      } else {
        if (competingDomains.length < 3 && !competingDomains.includes(hostname)) {
          competingDomains.push(hostname);
        }
      }
    }

    return {
      query: bucket.query,
      query_type: bucket.type,
      cited: citationPosition !== null,
      citation_position: citationPosition,
      competing_domains: competingDomains,
      perplexity_status: 'success' as const,
    };
  });

  // Data quality check
  const nonSuccessCount = citationResults.filter(
    (r) => r.perplexity_status !== 'success'
  ).length;

  let citationRate: number | null;
  let citationDataQuality: 'sufficient' | 'insufficient';

  if (nonSuccessCount > 10) {
    citationRate = null;
    citationDataQuality = 'insufficient';
  } else {
    const citedCount = citationResults.filter((r) => r.cited).length;
    citationRate = citedCount / 20;
    citationDataQuality = 'sufficient';
  }

  // Build citation gaps — not_cited entries first
  const citationGaps: CitationGap[] = citationResults
    .map((r) => ({
      query: r.query,
      query_type: r.query_type,
      status: r.cited ? ('cited' as const) : ('not_cited' as const),
      citation_position: r.citation_position,
      displaced_by: r.competing_domains,
    }))
    .sort((a, b) => {
      if (a.status === 'not_cited' && b.status === 'cited') return -1;
      if (a.status === 'cited' && b.status === 'not_cited') return 1;
      return 0;
    });

  return { citationResults, citationGaps, citationRate, citationDataQuality };
}

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

    // 1. Extract target domain — return 400 immediately if URL is malformed
    let targetDomain: string;
    try {
      targetDomain = new URL(url).hostname.replace(/^www\./, '');
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
              recommendations: [],
            };

            if (!subscription.isPremium) {
              analysisResult.remainingAnalyses = subscription.remainingAnalyses;
            }

            // Forward new citation fields from cache
            if (cachedAnalysis.citation_rate != null) {
              analysisResult.citationRate = cachedAnalysis.citation_rate;
            }
            if (cachedAnalysis.citation_gaps != null) {
              analysisResult.citationGaps = cachedAnalysis.citation_gaps;
            }
            if (cachedAnalysis.query_buckets != null) {
              analysisResult.queryBuckets = cachedAnalysis.query_buckets;
              analysisResult.visibilityQueries = cachedAnalysis.query_buckets.map((q) => q.query);
            }
            if (cachedAnalysis.citation_data_quality != null) {
              analysisResult.citationDataQuality = cachedAnalysis.citation_data_quality;
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

    // 7. Call OpenAI (this is the expensive operation)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in SEO, GEO (Generative Engine Optimization), and LLM citation analysis.',
        },
        { role: 'user', content: analysisPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content;
    console.log('🧠 GPT response received');

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
        { error: 'Invalid JSON from OpenAI', raw },
        { status: 500 }
      );
    }

    // 9. Run Perplexity citation checks (authenticated users only)
    let citationResults: CitationResult[] | undefined;
    let citationGaps: CitationGap[] | undefined;
    let citationRate: number | null | undefined;
    let citationDataQuality: 'sufficient' | 'insufficient' | undefined;

    if (subscription.isAuthenticated && analysisResult.queryBuckets && analysisResult.queryBuckets.length > 0) {
      try {
        console.log(`🔍 Running citation checks for ${targetDomain} (${analysisResult.queryBuckets.length} queries)`);
        const citationData = await runCitationChecks(analysisResult.queryBuckets, targetDomain);
        citationResults = citationData.citationResults;
        citationGaps = citationData.citationGaps;
        citationRate = citationData.citationRate;
        citationDataQuality = citationData.citationDataQuality;

        analysisResult.citationRate = citationRate;
        analysisResult.citationGaps = citationGaps;
        analysisResult.citationDataQuality = citationDataQuality;

        console.log(`✅ Citation check complete: rate=${citationRate}, quality=${citationDataQuality}`);
      } catch (citationError) {
        console.error('⚠️ Citation check failed, continuing without citation data:', citationError);
      }
    }

    // 10. Increment analysis count ONLY after successful analysis
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
          citationResults: citationResults ?? null,
          citationRate: citationRate ?? null,
          citationGaps: citationGaps ?? null,
          queryBuckets: analysisResult.queryBuckets ?? null,
          citationDataQuality: citationDataQuality ?? null,
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
