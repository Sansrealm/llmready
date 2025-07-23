import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// AI prompts for each fix type
const AI_PROMPTS = {
    'title-tag': (content, context) => `
    Create an optimized SEO title tag for this webpage:
    
    URL: ${context.url}
    Current title: "${context.pageTitle || 'No title'}"
    Industry: ${context.industry || 'General'}
    Page content preview: ${content.substring(0, 500)}
    
    Requirements:
    - 50-60 characters optimal length
    - Include primary keyword naturally
    - Compelling and click-worthy
    - Accurate to page content
    - Optimized for both search engines and AI models
    
    Return only the optimized title tag text, no quotes or HTML tags.
  `,

    'meta-description': (content, context) => `
    Write an optimized meta description for this webpage:
    
    URL: ${context.url}
    Current meta: "${context.metaDescription || 'No meta description'}"
    Industry: ${context.industry || 'General'}
    Page content preview: ${content.substring(0, 500)}
    
    Requirements:
    - 150-160 characters
    - Include primary keyword naturally
    - Compelling call-to-action
    - Accurately describe page content
    - Optimized for AI model understanding
    
    Return only the meta description text, no quotes or HTML tags.
  `,

    'schema-markup': (content, context) => `
    Generate JSON-LD schema markup for this webpage:
    
    URL: ${context.url}
    Title: ${context.pageTitle || ''}
    Industry: ${context.industry || 'General'}
    Content preview: ${content.substring(0, 800)}
    
    Choose the most appropriate schema type (Article, Product, Service, Organization, WebPage, etc.) based on the content.
    Create complete, valid JSON-LD markup with all relevant properties.
    
    Return only the JSON-LD code wrapped in <script> tags that can be copied directly into the <head> section:
    
    <script type="application/ld+json">
    {
      // Your schema markup here
    }
    </script>
  `,

    'internal-links': (content, context) => `
    Suggest internal linking opportunities for this page:
    
    URL: ${context.url}
    Current headings: ${context.headings?.join(', ') || 'None'}
    Industry: ${context.industry || 'General'}
    Content preview: ${content.substring(0, 800)}
    
    Provide 3-5 internal linking suggestions with:
    1. Recommended anchor text
    2. Suggested target page type/topic
    3. Where to place the link (paragraph, heading section)
    4. SEO and AI discoverability benefit
    
    Format as a numbered list with actionable recommendations.
  `,

    'content-improvement': (content, context) => `
    Provide specific content improvements to make this page more LLM-friendly and discoverable:
    
    URL: ${context.url}
    Current title: ${context.pageTitle || ''}
    Industry: ${context.industry || 'General'}
    Content preview: ${content.substring(0, 800)}
    
    Focus on:
    - Missing semantic HTML structure
    - Keyword optimization opportunities
    - Content gaps for AI understanding
    - Structured data opportunities
    - Readability improvements
    
    Provide 3-5 specific, actionable improvements with code examples where applicable.
    Format each improvement clearly with the issue and solution.
  `
};

export async function POST(request) {
    try {
        // Get authentication status from Clerk
        const { has, userId } = await auth();

        console.log('🔐 Generate Fix - User authentication status:', userId ? 'Authenticated' : 'Not authenticated');

        // Check if user is authenticated
        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Check if user has premium plan
        const hasPremiumPlan = has({ plan: 'llm_check_premium' });
        console.log('💎 Premium status check:', hasPremiumPlan ? 'Premium' : 'Free');

        if (!hasPremiumPlan) {
            return NextResponse.json(
                { error: 'Premium subscription required for AI fix generation' },
                { status: 403 }
            );
        }

        // Get request data
        const requestData = await request.json();
        const { type, currentContent, url, context } = requestData;

        // Validate required fields
        if (!type || !currentContent || !url) {
            return NextResponse.json(
                { error: 'Missing required fields: type, currentContent, and url are required' },
                { status: 400 }
            );
        }

        // Validate fix type
        if (!AI_PROMPTS[type]) {
            return NextResponse.json(
                { error: `Invalid fix type. Supported types: ${Object.keys(AI_PROMPTS).join(', ')}` },
                { status: 400 }
            );
        }

        console.log(`🤖 Generating ${type} fix for URL: ${url}`);

        // Generate AI prompt
        const prompt = AI_PROMPTS[type](currentContent, { ...context, url });

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an expert SEO and web optimization specialist with deep knowledge of how Large Language Models understand and index web content. Provide practical, implementable solutions that improve both search engine visibility and AI model comprehension."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });

        const generatedFix = completion.choices[0]?.message?.content;

        if (!generatedFix) {
            console.error('❌ No content generated from OpenAI');
            return NextResponse.json(
                { error: 'Failed to generate fix - no content returned' },
                { status: 500 }
            );
        }

        // Log successful generation
        console.log(`✅ ${type} fix generated successfully for user ${userId}`);

        // Return the generated fix
        return NextResponse.json({
            success: true,
            fix: generatedFix,
            type,
            generatedAt: new Date().toISOString(),
            metadata: {
                userId,
                url,
                fixType: type
            }
        });

    } catch (error) {
        console.error('🔥 Generate fix error:', error);

        // Handle OpenAI specific errors
        if (error.code === 'insufficient_quota') {
            return NextResponse.json(
                { error: 'OpenAI quota exceeded. Please try again later.' },
                { status: 503 }
            );
        }

        if (error.code === 'rate_limit_exceeded') {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again in a moment.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to generate fix', message: error.message },
            { status: 500 }
        );
    }
}