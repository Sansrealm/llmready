import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Add this function to verify Turnstile tokens
async function verifyTurnstile(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });
  const data = await res.json();
  return data.success;
}

export async function POST(request) {
  try {
    // ✅ Get token and other fields
    const { url, email, industry, turnstileToken } = await request.json();

    // ✅ Verify Turnstile before proceeding
    const isHuman = await verifyTurnstile(turnstileToken);
    if (!isHuman) {
      return NextResponse.json({ error: "Bot verification failed." }, { status: 403 });
    }

    // 1. Fetch website content
    const response = await fetch(url);
    const html = await response.text();

    // 2. Parse HTML with cheerio
    const $ = cheerio.load(html);

    // 3. Extract relevant data
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const headings = $('h1, h2, h3').map((i, el) => $(el).text()).get();
    const paragraphs = $('p').map((i, el) => $(el).text()).get().slice(0, 10); // First 10 paragraphs
    const hasSchema = $('script[type="application/ld+json"]').length > 0;
    const hasMobileViewport = $('meta[name="viewport"]').length > 0;
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;

    // 4. Analyze with OpenAI
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
      
      Return a JSON object with the following structure:
      {
        "overall_score": (number between 0-100),
        "parameters": [
          {
            "name": "Content Quality",
            "score": (number between 0-100),
            "isPremium": false,
            "description": (brief description)
          },
          {
            "name": "Metadata Optimization",
            "score": (number between 0-100),
            "isPremium": false,
            "description": (brief description)
          },
          {
            "name": "Mobile Responsiveness",
            "score": (number between 0-100),
            "isPremium": false,
            "description": (brief description)
          },
          {
            "name": "Schema Implementation",
            "score": (number between 0-100),
            "isPremium": true,
            "description": (brief description)
          },
          {
            "name": "Content Structure",
            "score": (number between 0-100),
            "isPremium": true,
            "description": (brief description)
          }
        ],
        "recommendations": [
          {
            "title": (brief title),
            "description": (detailed recommendation),
            "difficulty": (one of: "Easy", "Medium", "Hard"),
            "impact": (one of: "Low", "Medium", "High"),
            "isPremium": (boolean - at least 2 should be false for free users)
          }
          // Include at least 3 recommendations
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert in SEO and LLM optimization. Analyze websites and provide scores and recommendations in JSON format." },
        { role: "user", content: analysisPrompt }
      ],
      response_format: { type: "json_object" }
    });

    // 5. Process and return results
    const raw = completion.choices[0].message.content;
    console.log("GPT response:", raw);

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
      console.error("❌ GPT JSON parse or shape error:", err);
      return NextResponse.json({
        error: "Invalid JSON structure from OpenAI",
        raw,
      }, { status: 500 });
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze website', message: error.message },
      { status: 500 }
    );
  }
}
