import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MINIMUM_CONFIDENCE = 50;

// Enhanced AI prompts for each fix type with confidence scoring
const AI_PROMPTS = {
    'title-tag': (content, context) => `
You are an expert SEO specialist analyzing a website's title tag optimization.

WEBSITE CONTENT TO ANALYZE:
- URL: ${context.url}
- Current Title: "${context.pageTitle || 'No title found'}"
- Industry: ${context.industry || 'General'}
- Full Page Content: "${content}"

STRICT ANALYSIS REQUIREMENTS:
1. ONLY use the provided website content above - do not make assumptions about content not shown
2. Base your title recommendations ONLY on what you can see in the actual page content
3. If the content is insufficient to create a confident recommendation, state this clearly

TASK: Generate an improved title tag that:
- Accurately reflects the actual page content shown above
- Incorporates primary keywords found in the content
- Stays within 50-60 characters
- Improves SEO while remaining descriptive

RESPONSE FORMAT (JSON):
{
  "confidence": [0-100 number based on content sufficiency],
  "title": "Your optimized title here",
  "reasoning": "Brief explanation of why this title works based on the actual content",
  "implementation": {
    "htmlCode": "<title>Your optimized title here</title>",
    "placement": "Replace the existing <title> tag in the <head> section of your HTML",
    "steps": ["Open your website's HTML file", "Find the <head> section", "Locate the <title> tag", "Replace with the new title"],
    "difficulty": "Easy"
  }
}

If confidence is below 50%, explain what additional information would be needed.`,

    'meta-description': (content, context) => `
You are an expert SEO specialist optimizing meta descriptions.

WEBSITE CONTENT TO ANALYZE:
- URL: ${context.url}
- Current Meta Description: "${context.metaDescription || 'No meta description found'}"
- Page Title: "${context.pageTitle || 'No title'}"
- Industry: ${context.industry || 'General'}
- Full Page Content: "${content}"

STRICT REQUIREMENTS:
1. ONLY analyze the actual content provided - no assumptions
2. Create description based solely on what you can see in the page content
3. If content is insufficient for confident recommendation, state this clearly

TASK: Generate an optimized meta description that:
- Accurately summarizes the actual page content
- Includes primary keywords found in the content
- Stays within 150-160 characters
- Compels clicks while being truthful

RESPONSE FORMAT (JSON):
{
  "confidence": [0-100],
  "description": "Your optimized meta description",
  "reasoning": "Why this description works for the actual content",
  "implementation": {
    "htmlCode": "<meta name=\\"description\\" content=\\"Your optimized meta description\\">",
    "placement": "Add to <head> section of your HTML, replace existing if present",
    "steps": ["Open your website's HTML file", "Find the <head> section", "Look for existing meta description tag", "Replace or add the new meta description"],
    "difficulty": "Easy"
  }
}`,

    'schema-markup': (content, context) => `
You are a structured data expert specializing in Schema.org markup.

WEBSITE ANALYSIS:
- URL: ${context.url}
- Page Title: "${context.pageTitle || 'No title'}"
- Industry: ${context.industry || 'General'}
- Full Page Content: "${content}"

STRICT REQUIREMENTS:
1. ONLY suggest schema that matches the actual content shown
2. Do not assume business type, products, or services not evident in content
3. Use only data that can be extracted from the provided content

TASK: Generate appropriate schema markup based on actual content:
- Identify content type from actual page content
- Select most relevant schema.org types
- Use only data visible in the content
- Ensure valid JSON-LD format

RESPONSE FORMAT (JSON):
{
  "confidence": [0-100],
  "schemaType": "Organization|Article|Product|etc",
  "reasoning": "Why this schema type based on actual content",
  "implementation": {
    "htmlCode": "<script type=\\"application/ld+json\\">\\n{\\n  \\"@context\\": \\"https://schema.org\\",\\n  \\"@type\\": \\"SchemaType\\",\\n  // structured data here\\n}\\n</script>",
    "placement": "Add to <head> section before closing </head> tag",
    "steps": ["Open HTML file", "Locate <head> section", "Add script tag before </head>", "Validate with Google's structured data tool"],
    "difficulty": "Hard"
  }
}`,

    'internal-links': (content, context) => `
You are an internal linking expert for SEO and AI discoverability.

WEBSITE ANALYSIS:
- URL: ${context.url}
- Current Headings: ${context.headings?.join(', ') || 'None detected'}
- Industry: ${context.industry || 'General'}
- Full Page Content: "${content}"

STRICT REQUIREMENTS:
1. ONLY suggest links based on actual content topics shown
2. Do not assume pages or content that doesn't exist
3. Focus on realistic, implementable linking opportunities

TASK: Suggest internal linking opportunities based on actual content:
- Identify key topics in the content
- Suggest relevant anchor text from actual content
- Recommend realistic target page types
- Explain SEO and AI discoverability benefits

RESPONSE FORMAT (JSON):
{
  "confidence": [0-100],
  "suggestions": [
    {
      "anchorText": "suggested anchor text from content",
      "targetPageType": "type of page to link to",
      "placement": "where in content to place link",
      "reasoning": "why this helps SEO and AI discovery"
    }
  ],
  "implementation": {
    "htmlCode": "<a href=\\"/target-page\\">anchor text</a>",
    "placement": "Within relevant content sections",
    "steps": ["Identify target pages", "Create relevant anchor text", "Insert links naturally in content", "Test all links work"],
    "difficulty": "Medium"
  }
}`,

    'content-improvement': (content, context) => `
You are a content optimization expert focusing on LLM readability and SEO.

CONTENT TO ANALYZE:
- URL: ${context.url}
- Current Title: "${context.pageTitle || 'No title'}"
- Industry: ${context.industry || 'General'}
- Full Page Content: "${content}"
- Word Count: ${content.split(' ').length}

STRICT REQUIREMENTS:
1. ONLY suggest improvements based on the actual content provided
2. Preserve the original meaning and purpose of the content
3. Focus on structure and clarity improvements, not complete rewrites

TASK: Suggest content improvements for:
- Better LLM understanding and parsing
- Improved readability and structure
- Enhanced semantic clarity
- Better keyword distribution (using words already in content)

RESPONSE FORMAT (JSON):
{
  "confidence": [0-100],
  "improvements": [
    {
      "area": "Content Structure|Headings|Keywords|etc",
      "issue": "specific issue found",
      "solution": "specific improvement suggestion",
      "reasoning": "why this improves LLM readability"
    }
  ],
  "implementation": {
    "htmlCode": "<!-- Example improved content structure -->\\n<h2>Improved Heading</h2>\\n<p>Enhanced paragraph structure</p>",
    "placement": "Update content sections in main content area",
    "steps": ["Review content structure", "Add clear headings", "Improve paragraph flow", "Use semantic HTML tags"],
    "difficulty": "Medium"
  }
}`
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

        // Validate content length for confidence
        if (!currentContent || currentContent.length < 100) {
            return NextResponse.json({
                success: false,
                error: 'Insufficient content for reliable fix generation',
                reason: 'Need more webpage content to generate confident recommendations'
            }, { status: 400 });
        }

        console.log(`🤖 Generating ${type} fix for URL: ${url} (${currentContent.length} chars of content)`);

        // Generate AI prompt with enhanced specificity
        const prompt = AI_PROMPTS[type](currentContent, { ...context, url });

        // Call OpenAI API with lower temperature for more consistent results
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an expert SEO and web optimization specialist. Always respond with valid JSON only. Be conservative with confidence scores - only give high confidence when you have sufficient content to make reliable recommendations."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1500,
            temperature: 0.3, // Lower temperature for more consistent, accurate responses
        });

        const responseText = completion.choices[0]?.message?.content;

        if (!responseText) {
            console.error('❌ No content generated from OpenAI');
            return NextResponse.json(
                { error: 'Failed to generate fix - no content returned' },
                { status: 500 }
            );
        }

        // Parse the JSON response
        let parsedResponse;
        try {
            // Clean the response to extract JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                // Fallback to original response if no JSON found
                console.log('⚠️ No JSON format detected, using original response');
                return NextResponse.json({
                    success: true,
                    fix: responseText,
                    type,
                    generatedAt: new Date().toISOString(),
                    confidence: 75, // Default confidence for non-JSON responses
                    metadata: {
                        userId,
                        url,
                        fixType: type
                    }
                });
            }
            parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('Failed to parse AI response, using original:', parseError);
            // Fallback to original response
            return NextResponse.json({
                success: true,
                fix: responseText,
                type,
                generatedAt: new Date().toISOString(),
                confidence: 75, // Default confidence for unparseable responses
                metadata: {
                    userId,
                    url,
                    fixType: type
                }
            });
        }

        // Check confidence threshold for JSON responses
        if (parsedResponse.confidence && parsedResponse.confidence < MINIMUM_CONFIDENCE) {
            return NextResponse.json({
                success: false,
                error: 'Low confidence fix',
                reason: `Confidence score (${parsedResponse.confidence}%) below minimum threshold (${MINIMUM_CONFIDENCE}%). ${parsedResponse.reasoning || 'Insufficient content for reliable recommendation.'}`
            }, { status: 400 });
        }

        // Extract the main content based on fix type
        let fixContent = '';
        if (parsedResponse.title) fixContent = parsedResponse.title;
        else if (parsedResponse.description) fixContent = parsedResponse.description;
        else if (parsedResponse.suggestions) fixContent = JSON.stringify(parsedResponse.suggestions, null, 2);
        else if (parsedResponse.improvements) fixContent = JSON.stringify(parsedResponse.improvements, null, 2);
        else fixContent = responseText;

        // Log successful generation
        console.log(`✅ ${type} fix generated successfully with ${parsedResponse.confidence || 'default'}% confidence`);

        // Return enhanced response with confidence and implementation guide
        return NextResponse.json({
            success: true,
            fix: fixContent,
            type,
            generatedAt: new Date().toISOString(),
            confidence: parsedResponse.confidence || 75,
            implementationGuide: parsedResponse.implementation || {
                placement: 'In your website files',
                steps: ['Copy the generated content', 'Paste into your website'],
                htmlCode: fixContent,
                difficulty: 'Medium'
            },
            reasoning: parsedResponse.reasoning,
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