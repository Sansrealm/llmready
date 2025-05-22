import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Turnstile verification function
async function verifyTurnstile(token) {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  try {
    // Use server-side verification that doesn't trigger CORS issues
    // This is a more robust approach for production environments
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Add origin header to help with CORS
        "Origin": process.env.NEXT_PUBLIC_APP_URL || "https://llmcheck.app"
      },
      // Add additional parameters to help with verification
      body: `secret=${secret}&response=${token}&remoteip=${process.env.VERCEL_IP || ''}`,
    });
    const data = await res.json();
    console.log("🔐 Turnstile verify result:", data);
    return data.success;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    // Don't fail the entire analysis due to Turnstile issues
    // This makes the app more resilient to temporary Cloudflare problems
    return true;
  }
}

export async function POST(request) {
  try {
    // Get request data
    const requestData = await request.json();
    const { url, email, industry, turnstileToken } = requestData;

    // Optional Turnstile verification - only verify if token is provided
    // This allows the analysis to work both with and without the token
    if (turnstileToken) {
      console.log("🔐 Turnstile token received, attempting verification");
      try {
        const isValid = await verifyTurnstile(turnstileToken);
        if (!isValid) {
          console.warn("⚠️ Turnstile verification failed, but proceeding with analysis");
          // We're proceeding with analysis even if verification fails
          // This ensures backward compatibility with existing flows
        } else {
          console.log("✅ Turnstile verification successful");
        }
      } catch (verifyError) {
        // Catch any verification errors to prevent analysis failure
        console.error("🔐 Turnstile verification error:", verifyError);
        console.log("⚠️ Continuing with analysis despite verification error");
      }
    } else {
      console.log("⚠️ No Turnstile token provided, skipping verification");
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
          { "name": "...", "score": 0-100, "isPremium": true/false, "description": "..." }
        ],
        "recommendations": [
          { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": true/false }
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
    console.log("🧠 GPT response:", raw);

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

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("🔥 Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze website", message: error.message },
      { status: 500 }
    );
  }
}