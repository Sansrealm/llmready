import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { getUserSubscription, incrementAnalysisCount } from '@/lib/auth-utils';
import { saveAnalysis } from '@/lib/db';
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
      Return a JSON object with this shape:

      {
        "overall_score": (0-100),
        "parameters": [
          { "name": "...", "score": 0-100, "isPremium": ${!showPremiumContent}, "description": "..." }
        ],
        "recommendations": [
          { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": ${!showPremiumContent} }
        ]
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
        await saveAnalysis({
          userId: subscription.userId,
          url: url,
          overallScore: analysisResult.overall_score,
          parameters: analysisResult.parameters,
        });
        console.log('✅ Analysis saved to database');
      } catch (dbError) {
        // Log error but don't block user from getting results
        console.error('❌ Failed to save analysis to database:', dbError);
        // Continue - user still gets their analysis results
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
