import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { getUserSubscription, incrementAnalysisCount } from '@/lib/auth-utils';
import { saveAnalysis, getAnalysisByUrl, captureGuestEmail } from '@/lib/db';
import { AnalysisResult, AnalysisRequest } from '@/lib/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Check for cached analysis if requested
    const searchParams = request.nextUrl.searchParams;
    const useCached = searchParams.get('cached') === 'true';

    if (useCached && subscription.isAuthenticated && subscription.userId) {
      try {
        const cachedAnalysis = await getAnalysisByUrl(subscription.userId, url);

        if (cachedAnalysis) {
          const cacheAge = Date.now() - new Date(cachedAnalysis.analyzed_at).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;

          // Return cached analysis if less than 24 hours old
          if (cacheAge < oneDayMs) {
            console.log(`✅ Returning cached analysis (age: ${Math.floor(cacheAge / 1000 / 60)} minutes)`);

            const analysisResult: AnalysisResult = {
              overall_score: cachedAnalysis.overall_score,
              parameters: cachedAnalysis.parameters,
              recommendations: [], // Recommendations are generated fresh each time
            };

            // Add remaining count for free users
            if (!subscription.isPremium) {
              analysisResult.remainingAnalyses = subscription.remainingAnalyses;
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
        // Log error but continue to fresh analysis
        console.error('⚠️ Cache lookup failed, continuing with fresh analysis:', cacheError);
      }
    }

    // Check if authenticated user can analyze
    if (subscription.isAuthenticated && !subscription.canAnalyze) {
      const upgradeMessage = subscription.isPremium
        ? `You've reached the premium analysis limit (${subscription.limit} analyses). Please contact support for higher limits.`
        : `You've reached the maximum number of analyses for free users (${subscription.limit}). Please upgrade to Premium for more analyses.`;

      return NextResponse.json(
        { error: upgradeMessage },
        { status: 403 }
      );
    }

    // 1. Fetch website content
    const response = await fetch(url);
    const html = await response.text();

    // 2. Parse HTML
    const $ = cheerio.load(html);
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const headings = $('h1, h2, h3').map((i, el) => $(el).text()).get();
    const paragraphs = $('p').map((i, el) => $(el).text()).get().slice(0, 10);
    const hasSchema = $('script[type="application/ld+json"]').length > 0;
    const hasMobileViewport = $('meta[name="viewport"]').length > 0;
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;

    // 3. OpenAI prompt
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
      And generate 5 search queries a potential customer might type into ChatGPT or Perplexity
      when looking for this product/service. Base them on the meta description and content.

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
        "visibility_queries": ["query 1", "query 2", "query 3", "query 4", "query 5"]
      }
    `;

    // 4. Call OpenAI (this is the expensive operation)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert in SEO and LLM optimization." },
        { role: "user", content: analysisPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const raw = completion.choices[0].message.content;
    console.log("🧠 GPT response received");

    // 5. Parse and validate response
    let analysisResult: AnalysisResult;
    try {
      const parsed = JSON.parse(raw || '{}');
      if (
        typeof parsed !== "object" ||
        typeof parsed.overall_score !== "number" ||
        !Array.isArray(parsed.parameters) ||
        !Array.isArray(parsed.recommendations)
      ) {
        throw new Error("Invalid analysis structure");
      }
      analysisResult = parsed as AnalysisResult;

      // Extract GPT-detected industry and visibility queries (additive fields)
      if (typeof parsed.industry === 'string' && parsed.industry) {
        analysisResult.industry = parsed.industry;
      }
      if (Array.isArray(parsed.visibility_queries) && parsed.visibility_queries.length > 0) {
        analysisResult.visibilityQueries = parsed.visibility_queries.slice(0, 5);
      }
    } catch (err) {
      console.error("❌ JSON parse or structure error:", err);
      return NextResponse.json(
        { error: "Invalid JSON from OpenAI", raw },
        { status: 500 }
      );
    }

    // 6. CRITICAL: Increment count ONLY after successful analysis
    // This prevents charging users for failed analyses (fixes race condition)
    if (subscription.isAuthenticated && subscription.userId) {
      try {
        const newCount = await incrementAnalysisCount(subscription.userId);

        // Calculate remaining for response
        const newRemaining = Math.max(0, subscription.limit - newCount);

        // Add remaining count to response
        if (!subscription.isPremium) {
          analysisResult.remainingAnalyses = newRemaining;
        }

        console.log(`✅ Analysis count updated: ${subscription.analysisCount} → ${newCount} (remaining: ${newRemaining})`);
      } catch (countError) {
        console.error('⚠️ Failed to increment analysis count:', countError);
        // Don't block the user from getting results even if count update fails
      }
    }

    // 7. Save analysis to database (only for authenticated users)
    if (subscription.isAuthenticated && subscription.userId) {
      try {
        const savedAnalysis = await saveAnalysis({
          userId: subscription.userId,
          url: url,
          overallScore: analysisResult.overall_score,
          parameters: analysisResult.parameters,
        });
        console.log('✅ Analysis saved to database');

        // Add the analysis ID to the result
        analysisResult.id = savedAnalysis.id;
      } catch (dbError) {
        // Log error but don't block user from getting results
        console.error('❌ Failed to save analysis to database:', dbError);
        // Continue - user still gets their analysis results
      }
    }

    // 8. Capture guest email if provided (Phase 1: Guest Email Capture)
    // Only captures for unauthenticated users after successful analysis
    if (!subscription.isAuthenticated && email) {
      try {
        await captureGuestEmail(email);
        console.log('✅ Guest email captured for outreach');
      } catch (emailError) {
        // Log error but don't block analysis results
        console.error('⚠️ Failed to capture guest email:', emailError);
        // Continue - email capture is nice-to-have, not critical
      }
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("🔥 Analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: "Failed to analyze website", message: errorMessage },
      { status: 500 }
    );
  }
}
