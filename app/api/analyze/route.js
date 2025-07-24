// api/analyze/route.js - Enhanced to capture full content for fix generation
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced scraping to capture full content for fix generation
async function scrapeWebsite(url) {
  let browser;
  try {
    console.log(`🔍 Scraping: ${url}`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Set timeout and wait for network idle
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Get the full HTML content
    const html = await page.content();
    const $ = cheerio.load(html);

    // Remove script and style elements for cleaner content
    $('script, style, nav, footer, .sidebar, #sidebar, .nav, .menu').remove();

    // Extract comprehensive content
    const title = $('title').text().trim() || '';
    const metaDescription = $('meta[name="description"]').attr('content') || '';

    // Get all headings with structure
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const level = parseInt(el.tagName.charAt(1));
      const text = $(el).text().trim();
      if (text) {
        headings.push({ level, text });
      }
    });

    // Get all paragraph content
    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20) { // Filter out very short paragraphs
        paragraphs.push(text);
      }
    });

    // Extract schema markup
    const schemaMarkup = [];
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).html());
        schemaMarkup.push(jsonData);
      } catch (e) {
        console.warn('Invalid JSON-LD found:', $(el).html());
      }
    });

    // Get full text content (main content areas only)
    const mainContent = $('main, .main, .content, article, .article, .post, .entry-content').first();
    let fullContent = '';

    if (mainContent.length > 0) {
      fullContent = mainContent.text().trim();
    } else {
      // Fallback: get body content excluding common non-content areas
      $('header, nav, footer, aside, .header, .nav, .footer, .sidebar, .advertisement, .ads').remove();
      fullContent = $('body').text().trim();
    }

    // Clean up whitespace and limit size (but keep much more than before)
    fullContent = fullContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
      .substring(0, 8000); // Increased from 1000 to 8000 characters

    // Calculate word count
    const wordCount = fullContent.split(/\s+/).filter(word => word.length > 0).length;

    console.log(`✅ Scraped ${url}: ${title} (${wordCount} words, ${fullContent.length} chars)`);

    return {
      title,
      metaDescription,
      headings,
      paragraphs: paragraphs.slice(0, 10), // Limit to first 10 paragraphs for analysis
      schemaMarkup,
      fullContent, // This is the key enhancement - full content for fix generation
      wordCount,
      url
    };

  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Enhanced analysis prompt that acknowledges full content availability
function createAnalysisPrompt(content) {
  return `You are an expert SEO and AI optimization specialist. Analyze this website for LLM readiness and SEO optimization.

WEBSITE DATA:
- URL: ${content.url}
- Title: "${content.title}"
- Meta Description: "${content.metaDescription}"
- Word Count: ${content.wordCount}
- Headings (${content.headings.length}): ${content.headings.map(h => `H${h.level}: ${h.text}`).join(', ')}
- Schema Markup: ${content.schemaMarkup.length > 0 ? 'Present' : 'None'}
- Content Preview: "${content.fullContent.substring(0, 3000)}..." 

ANALYSIS FRAMEWORK:
Rate each parameter 0-100 and provide specific, actionable feedback based on the actual content shown.

Required Parameters:
1. Title Tag Optimization (SEO title effectiveness)
2. Meta Description Quality (clarity and appeal)
3. Heading Structure (H1-H6 hierarchy and SEO)
4. Content Quality (readability and structure for LLMs)
5. Schema Markup (structured data implementation)
6. Keyword Integration (natural keyword usage)
7. Content Depth (comprehensive topic coverage)
8. Technical SEO (basic on-page elements)

IMPORTANT: Base your analysis ONLY on the actual content provided. Don't make assumptions about content not shown.

Response Format (JSON):
{
  "overallScore": [0-100 weighted average],
  "parameters": [
    {
      "name": "Title Tag Optimization",
      "score": [0-100],
      "description": "Specific assessment based on actual title",
      "issues": ["specific issue 1", "specific issue 2"]
    }
    // ... other parameters
  ],
  "recommendations": [
    "Priority recommendation 1 based on actual content",
    "Priority recommendation 2 based on actual content"
  ]
}

Focus on actionable, specific feedback that can be used to generate targeted improvements.`;
}

export async function POST(request) {
  try {
    const { url, email, industry } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    console.log(`🔍 Starting enhanced analysis for: ${url}`);

    // Enhanced scraping with full content capture
    const scrapedContent = await scrapeWebsite(url);

    // Enhanced analysis using the full content
    const prompt = createAnalysisPrompt(scrapedContent);

    console.log('🤖 Analyzing with enhanced prompts...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO and LLM optimization specialist. Always respond with valid JSON only. Base your analysis strictly on the provided content - do not make assumptions about unseen content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the analysis response
    let analysisData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse analysis response:', responseText);
      throw new Error('Invalid response format from AI');
    }

    // Construct enhanced result with full content for fix generation
    const result = {
      overall_score: analysisData.overallScore || 0,  // underscore format
      pageTitle: scrapedContent.title,                // your expected field name
      metaDescription: scrapedContent.metaDescription, // your expected field name
      keywords: null, // Add if you have keyword extraction
      parameters: analysisData.parameters || [],
      recommendations: analysisData.recommendations || [],

      // ENHANCED: Add full content for fix generation (backwards compatible)
      scraped: scrapedContent, // Full scraped content including fullContent for fix generation
      timestamp: new Date().toISOString(),
      wordCount: scrapedContent.wordCount,

      // Add analysis metadata for debugging
      analysisMetadata: {
        hasFullContent: scrapedContent.fullContent.length > 1000,
        contentLength: scrapedContent.fullContent.length,
        readyForFixGeneration: true
      }
    };

    console.log(`✅ Analysis complete: ${result.overallScore}/100 (${scrapedContent.wordCount} words analyzed)`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Analysis error:', error);

    // Provide helpful error messages
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      return NextResponse.json({
        error: 'Website not accessible',
        details: 'The URL could not be reached. Please check if the website is online.'
      }, { status: 400 });
    }

    if (error.message.includes('timeout')) {
      return NextResponse.json({
        error: 'Website timeout',
        details: 'The website took too long to respond. Please try again.'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Analysis failed',
      details: error.message
    }, { status: 500 });
  }
}