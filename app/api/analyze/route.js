import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Usage limits for different user types
const MAX_GUEST_ANALYSES = 3;
const MAX_FREE_ANALYSES = 10;
const MAX_PREMIUM_ANALYSES = 100;

// Premium plan ID
const PREMIUM_PLAN_ID = 'llm_check_premium';

/**
 * Check if monthly usage should be reset
 * @param {string} lastResetDate - ISO date string of last reset
 * @returns {boolean} - Whether usage count should be reset
 */
function shouldResetUsageCount(lastResetDate) {
  if (!lastResetDate) return true;
  
  const lastReset = new Date(lastResetDate);
  const currentDate = new Date();
  
  // Reset if the current month is different from the last reset month
  return lastReset.getMonth() !== currentDate.getMonth() || 
         lastReset.getFullYear() !== currentDate.getFullYear();
}

export async function POST(request) {
  try {
    // Get authentication status from Clerk
    const { userId } = auth();

    // Get request data
    const requestData = await request.json();
    const { url, email, industry } = requestData;

    // Check user's subscription status and analysis count
    let isPremium = false;
    let analysisCount = 0;
    let remainingAnalyses = 0;
    let monthlyLimit = MAX_GUEST_ANALYSES;

    if (userId) {
      // Get user data from Clerk
      const user = await clerkClient.users.getUser(userId);
      
      // Check if user is premium by checking active subscriptions
      const subscriptions = user.privateMetadata?.subscriptions || [];
      isPremium = subscriptions.some(sub => 
        sub.planId === PREMIUM_PLAN_ID && 
        sub.status === 'active'
      );
      
      // Set monthly limit based on user type
      monthlyLimit = isPremium ? MAX_PREMIUM_ANALYSES : MAX_FREE_ANALYSES;
      
      // Get or initialize usage metadata
      let usageMetadata = user.privateMetadata?.analysisCount || {
        current: 0,
        lastReset: new Date().toISOString()
      };
      
      // Check if we need to reset the monthly counter
      if (shouldResetUsageCount(usageMetadata.lastReset)) {
        usageMetadata = {
          current: 0,
          lastReset: new Date().toISOString()
        };
      }
      
      // Get current analysis count
      analysisCount = usageMetadata.current || 0;
      
      // Check if user has reached their limit
      if (analysisCount >= monthlyLimit) {
        return NextResponse.json(
          { 
            error: isPremium 
              ? `You've reached the maximum number of ${monthlyLimit} analyses for this month. Your limit will reset at the beginning of next month.` 
              : `You've reached the maximum number of ${monthlyLimit} analyses for free users this month. Please upgrade to Premium for ${MAX_PREMIUM_ANALYSES} analyses per month.`,
            isPremium,
            analysisCount,
            monthlyLimit,
            remainingAnalyses: 0
          },
          { status: 403 }
        );
      }
      
      // Increment analysis count
      const newCount = analysisCount + 1;
      remainingAnalyses = monthlyLimit - newCount;
      
      // Update user metadata with new count
      await clerkClient.users.updateUser(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          analysisCount: {
            current: newCount,
            lastReset: usageMetadata.lastReset
          }
        }
      });
      
      // Update local count for response
      analysisCount = newCount;
    }

    // Log authentication status
    console.log(`🔐 User authentication status: ${userId ? (isPremium ? 'Premium' : 'Free') : 'Guest'}`);

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
          { "name": "...", "score": 0-100, "isPremium": ${!userId || isPremium ? false : true}, "description": "..." }
        ],
        "recommendations": [
          { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": ${!userId || isPremium ? false : true} }
        ]
      }
    `;

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

    let analysisResult;
    try {
      analysisResult = JSON.parse(raw);
      if (
        typeof analysisResult !== "object" ||
        typeof analysisResult.overall_score !== "number" ||
        !Array.isArray(analysisResult.parameters) ||
        !Array.isArray(analysisResult.recommendations)
      ) {
        throw new Error("Invalid analysis structure");
      }
    } catch (err) {
      console.error("❌ JSON parse or structure error:", err);
      return NextResponse.json({ error: "Invalid JSON from OpenAI", raw }, { status: 500 });
    }

    // Add usage information to the response
    if (userId) {
      analysisResult.usageInfo = {
        isPremium,
        analysisCount,
        monthlyLimit,
        remainingAnalyses
      };
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("🔥 Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze website", message: error.message },
      { status: 500 }
    );
  }
}
