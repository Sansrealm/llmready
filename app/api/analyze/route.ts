import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 120;
import * as cheerio from 'cheerio';
import { getUserSubscription, incrementAnalysisCount } from '@/lib/auth-utils';
import { clerkClient } from '@clerk/nextjs/server';
import { limitAnalyze, tryAcquireAnalyzeLock } from '@/lib/rate-limit';
import { logLlmSpend } from '@/lib/llm-spend';
import { saveAnalysis, getAnalysisByUrl, normalizeUrl } from '@/lib/db';
import { AnalysisResult, AnalysisRequest, QueryBucket } from '@/lib/types';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import FreeLimitReachedEmail from '@/emails/free-limit-reached';

// Anthropic client — used for website scoring (independent of measured models)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── v2 parameter weights (must sum to 1.0) ────────────────────────────────────
const PARAM_WEIGHTS: Record<string, number> = {
  answer_ready_content:    0.25,
  brand_expertise_clarity: 0.20,
  structured_data_depth:   0.20,
  citable_content_quality: 0.15,
  eeat_authority_signals:  0.10,
  intent_coverage_breadth: 0.10,
};

// Map Claude's display name → slug for weighted average computation
const PARAM_NAME_TO_SLUG: Record<string, string> = {
  'Answer-Ready Content':       'answer_ready_content',
  'Brand & Expertise Clarity':  'brand_expertise_clarity',
  'Structured Data Depth':      'structured_data_depth',
  'Citable Content Quality':    'citable_content_quality',
  'E-E-A-T & Authority Signals':'eeat_authority_signals',
  'Comparison & Intent Coverage':'intent_coverage_breadth',
};

// ── Main route handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Get user subscription info using centralized utility
    const subscription = await getUserSubscription();

    // Server-side auth gate. The UI routes unauthenticated users through
    // Clerk sign-in before hitting this endpoint; this rejects direct
    // (scripted / curl) bypasses so every analysis is attributable to a
    // Clerk user and counted against their tier limit.
    if (!subscription.isAuthenticated || !subscription.userId) {
      return NextResponse.json(
        { error: 'Sign in required' },
        { status: 401 }
      );
    }

    console.log(`🔐 User authentication status: ${
      subscription.isPremium
        ? `Premium (${subscription.analysisCount}/${subscription.limit})`
        : `Free (${subscription.analysisCount}/${subscription.limit})`
    }`);

    // Rate limit: burst protection on top of Clerk-based monthly caps.
    const rl = await limitAnalyze({ userId: subscription.userId });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfterSeconds ?? 60) },
        }
      );
    }

    // Get request data
    const requestData = await request.json() as AnalysisRequest;
    const { url, email, industry } = requestData;

    // 1. Validate URL — reject malformed, non-HTTP, and internal/private targets
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivateHost =
      /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?)$/.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^f[cd][0-9a-f]{2}:/i.test(hostname);
    if (isPrivateHost) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // 2. Dedup: prevent duplicate Claude calls on page refresh / rapid resubmit
    const normalizedUrl = normalizeUrl(url);
    const lockAcquired = await tryAcquireAnalyzeLock(subscription.userId, normalizedUrl);

    if (!lockAcquired) {
      const recent = await getAnalysisByUrl(subscription.userId, url);
      if (recent) {
        const age = Date.now() - new Date(recent.analyzed_at).getTime();
        if (age < 2 * 60 * 1000) {
          console.log(`[analyze] dedup hit — returning recent analysis (${Math.round(age / 1000)}s old)`);
          const dedupResult: AnalysisResult = {
            overall_score: recent.overall_score,
            parameters: recent.parameters,
            recommendations: recent.recommendations ?? [],
          };
          if (!subscription.isPremium) {
            dedupResult.remainingAnalyses = subscription.remainingAnalyses;
          }
          if (recent.query_buckets != null) {
            dedupResult.queryBuckets = recent.query_buckets;
            dedupResult.visibilityQueries = recent.query_buckets.map((q: QueryBucket) => q.query);
          }
          return NextResponse.json({
            id: recent.id,
            ...dedupResult,
            cached: true,
            analyzed_at: recent.analyzed_at,
          });
        }
      }
      return NextResponse.json(
        { error: 'Analysis already in progress for this URL. Please wait.' },
        { status: 409, headers: { 'Retry-After': '15' } }
      );
    }

    // 3. Check for cached analysis if requested
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

    // 4. Fetch website content (30s timeout, 5MB cap)
    const fetchController = new AbortController();
    const fetchTimer = setTimeout(() => fetchController.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(url, { signal: fetchController.signal, redirect: 'follow' });
    } catch (fetchErr: unknown) {
      clearTimeout(fetchTimer);
      const msg = fetchErr instanceof Error && fetchErr.name === 'AbortError'
        ? 'Website took too long to respond'
        : 'Could not reach the website';
      return NextResponse.json({ error: msg }, { status: 502 });
    } finally {
      clearTimeout(fetchTimer);
    }
    const fetchStatus = response.status;
    const pageBlocked = fetchStatus === 403 || fetchStatus === 401;
    if (pageBlocked) {
      console.warn(`[analyze] page blocked (HTTP ${fetchStatus}): ${url}`);
    }
    const html = await response.text();
    if (html.length > 5_000_000) {
      return NextResponse.json({ error: 'Page too large to analyze' }, { status: 400 });
    }

    // 5. Parse HTML — core signals
    const $ = cheerio.load(html);
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const headings = $('h1, h2, h3').map((i, el) => $(el).text().trim()).get().filter(Boolean);
    const paragraphs = $('p').map((i, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 15);
    const hasSchema = $('script[type="application/ld+json"]').length > 0;
    const hasMobileViewport = $('meta[name="viewport"]').length > 0;
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;

    // 6. Parse HTML — AI-specific extraction signals (v2)
    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '{}');
        const types = Array.isArray(parsed)
          ? parsed.map((p: { '@type'?: string }) => p['@type']).filter(Boolean)
          : parsed['@type'] ? [parsed['@type']] : [];
        schemaTypes.push(...(types as string[]));
      } catch { /* skip malformed */ }
    });

    const questionHeadings = headings.filter(h => h.includes('?')).length;
    const howToSignals = headings.filter(h => /how.?to|guide|tutorial|step/i.test(h)).length;
    const hasFaqSection = schemaTypes.some(t => t === 'FAQPage') ||
      headings.some(h => /\bfaq\b|frequently asked/i.test(h));
    const comparisonSignals = headings.filter(h =>
      /\bvs\.?\b|versus|alternative|compared to|comparison/i.test(h)).length;
    const contentText = paragraphs.join(' ');
    const statsCount = (contentText.match(/\d+%|\d+\s*(million|billion|thousand|\+\s*users|x\s*faster)/gi) || []).length;
    const hasAuthorSignal = $('meta[name="author"]').length > 0 ||
      $('[class*="author"], [class*="byline"]').length > 0 ||
      schemaTypes.some(t => ['Person', 'Article', 'BlogPosting'].includes(t));
    const hasDateSignal = $('meta[property="article:published_time"]').length > 0 ||
      schemaTypes.some(t => ['Article', 'BlogPosting', 'NewsArticle'].includes(t));

    let externalLinkCount = 0;
    try {
      const hostname = new URL(url).hostname;
      externalLinkCount = $('a[href^="http"]')
        .filter((_, el) => !$(el).attr('href')?.includes(hostname))
        .length;
    } catch { /* skip if URL parse fails */ }

    // 7. Build Claude prompt — v2 fixed 6-parameter evaluation
    const showPremiumContent = !subscription.isAuthenticated || subscription.isPremium;
    const analysisPrompt = `Analyze this website for AI visibility optimization.
URL: ${url}
Title: ${title}
Meta Description: ${metaDescription}

EXTRACTED SIGNALS:
Schema types detected: ${schemaTypes.length > 0 ? schemaTypes.join(', ') : 'none'}
Question headings (contain "?"): ${questionHeadings}
How-to / guide / tutorial headings: ${howToSignals}
FAQ section detected: ${hasFaqSection}
Comparison / vs / alternative headings: ${comparisonSignals}
Stat or data patterns in content: ${statsCount}
Author or byline signals: ${hasAuthorSignal}
Date or freshness signals: ${hasDateSignal}
External citation links: ${externalLinkCount}
Headings (first 25): ${headings.slice(0, 25).join(' | ')}
Content sample: ${paragraphs.join(' ').substring(0, 1500)}
Has mobile viewport: ${hasMobileViewport}
Images: ${images}, with alt text: ${imagesWithAlt}

Score EXACTLY these 6 parameters (no others). Each score 0–100.

Use this scoring scale for every parameter:
  0  = completely absent or broken
  25 = present but ineffective
  50 = functional but below best practice
  75 = good, meets most best practice criteria
 100 = exceptional, genuinely best-in-class
Score conservatively. Do not assign 100 unless the criterion is best-in-class.

PARAMETER SCORING CRITERIA:

1. "Answer-Ready Content" — slug: answer_ready_content — isPremium: false
   AI models cite content that directly answers queries. FAQ, how-to, Q&A formats = higher citation rate.
   0: no Q&A or how-to content, purely promotional
   50: some question headings or how-to sections, limited depth
   100: comprehensive FAQ (ideally FAQPage schema), rich how-to guides, direct answer format throughout

2. "Brand & Expertise Clarity" — slug: brand_expertise_clarity — isPremium: false
   Vague positioning = vague AI recommendations. AI needs a clear "what is this?"
   0: unclear what the site does, no specific value proposition
   50: general positioning present, not memorable or specific
   100: immediately clear what the brand does, who it's for, what makes it distinctive

3. "Structured Data Depth" — slug: structured_data_depth — isPremium: false
   Schema.org types (FAQ, Article, Organization, Product) are direct structured input to AI and search parsers.
   0: no JSON-LD or schema markup
   50: basic Organization or WebSite schema only
   100: rich schema (FAQPage, Article, Product, BreadcrumbList) with complete, correct fields

4. "Citable Content Quality" — slug: citable_content_quality — isPremium: ${!showPremiumContent}
   Generic copy gets skipped. Specific facts, statistics, and original data get cited.
   0: entirely generic marketing copy, no specific data or facts
   50: some specific details but mostly vague; few citable facts
   100: data-rich, specific statistics, original research or case studies, concrete claims AI can cite

5. "E-E-A-T & Authority Signals" — slug: eeat_authority_signals — isPremium: ${!showPremiumContent}
   AI models inherited authority weighting from training data. Author credentials, trust signals matter.
   0: no author info, no trust signals, no credentials
   50: some author or company info present but thin
   100: clear author credentials, bio pages, citations or press mentions, strong trust signals

6. "Comparison & Intent Coverage" — slug: intent_coverage_breadth — isPremium: ${!showPremiumContent}
   75% of AI queries are problem/category/comparison. Thin coverage = invisible to most queries.
   0: no comparison content, no problem/solution framing, no alternatives coverage
   50: some category-level content but no comparisons or vs. content
   100: dedicated comparison pages or sections, clear problem/solution framing, covers alternatives

WEIGHTED OVERALL SCORE:
Compute overall_score as weighted average (do NOT use a separate judgment):
  overall_score = round(
    answer_ready_content × 0.25 +
    brand_expertise_clarity × 0.20 +
    structured_data_depth × 0.20 +
    citable_content_quality × 0.15 +
    eeat_authority_signals × 0.10 +
    intent_coverage_breadth × 0.10
  )

INDUSTRY CLASSIFICATION:
Classify as one of: ecommerce, saas, media, education, healthcare, other.

QUERY BUCKETS:
Generate 20 search queries a potential customer might type into ChatGPT or Perplexity, organised into 4 typed buckets of 5 queries each:
- brand: queries that include the brand name or site name
- problem: queries describing the problem this product/service solves
- category: queries about the product/service category
- comparison: queries comparing this product/service against alternatives

RECOMMENDATIONS:
Generate exactly 5 recommendations tied to AI visibility improvement.
Each recommendation MUST:
- Target a specific parameter by its slug (include as "parameter" field — must be one of the 6 slugs above)
- Only recommend fixes for parameters scoring below 75
- Explain specifically how the action increases the likelihood AI models cite this site
- Be actionable and concrete, not generic SEO advice
- Order: most critical (lowest weighted score impact) first

Return a JSON object with this exact shape:

{
  "overall_score": <weighted average as computed above>,
  "parameters": [
    { "name": "Answer-Ready Content",       "score": 0-100, "isPremium": false,              "description": "..." },
    { "name": "Brand & Expertise Clarity",  "score": 0-100, "isPremium": false,              "description": "..." },
    { "name": "Structured Data Depth",      "score": 0-100, "isPremium": false,              "description": "..." },
    { "name": "Citable Content Quality",    "score": 0-100, "isPremium": ${!showPremiumContent}, "description": "..." },
    { "name": "E-E-A-T & Authority Signals","score": 0-100, "isPremium": ${!showPremiumContent}, "description": "..." },
    { "name": "Comparison & Intent Coverage","score": 0-100, "isPremium": ${!showPremiumContent}, "description": "..." }
  ],
  "recommendations": [
    { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": ${!showPremiumContent}, "parameter": "<slug>" },
    { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": ${!showPremiumContent}, "parameter": "<slug>" },
    { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": ${!showPremiumContent}, "parameter": "<slug>" },
    { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": ${!showPremiumContent}, "parameter": "<slug>" },
    { "title": "...", "description": "...", "difficulty": "Easy|Medium|Hard", "impact": "Low|Medium|High", "isPremium": ${!showPremiumContent}, "parameter": "<slug>" }
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

Note: Score based on the submitted URL only. If the site has richer content on sub-pages (e.g. /faq, /blog), the score reflects only what's visible at the analyzed URL.`;

    // 8. Call Claude for scoring (independent of the three models being measured)
    const claudePromise = anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      system: 'You are an expert in GEO (Generative Engine Optimization) and AI citation analysis. You help websites improve their visibility in AI-generated answers. Return only valid JSON — no markdown, no explanation, no code fences.',
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Claude scoring timed out after 90s')), 90000)
    );

    let message: Awaited<ReturnType<typeof anthropic.messages.create>>;
    try {
      message = await Promise.race([claudePromise, timeoutPromise]);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.includes('timed out');
      console.error('Claude scoring error:', err);
      return NextResponse.json(
        { error: isTimeout ? 'Analysis timed out — please try again' : 'Claude scoring failed' },
        { status: 503 }
      );
    }

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : '';
    // Strip markdown fences if present (multi-pass to handle ```json and bare ```)
    const raw = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    console.log('🧠 Claude response received');

    // Log LLM spend (non-blocking, never fails the request)
    void logLlmSpend({
      userId:    subscription.userId,
      endpoint:  'analyze',
      provider:  'anthropic',
      model:     'claude-sonnet-4-6',
      tokensIn:  message.usage.input_tokens,
      tokensOut: message.usage.output_tokens,
      requestId: message.id,
    });

    // 9. Parse and validate response
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

      // Clamp individual parameter scores to valid 0–100 integer range
      analysisResult.parameters = analysisResult.parameters.map(p => ({
        ...p,
        score: Math.round(Math.max(0, Math.min(100, p.score))),
      }));

      // Override overall_score with deterministic weighted average.
      // This ensures the score is always explainable regardless of what Claude returns.
      // PARAM_WEIGHTS sum to 1.0; if all 6 params matched, weightedSum IS the final score.
      // If only some matched (fallback), we normalize by weightApplied.
      let weightedSum = 0;
      let weightApplied = 0;
      for (const param of analysisResult.parameters) {
        const slug = PARAM_NAME_TO_SLUG[param.name];
        const weight = slug ? (PARAM_WEIGHTS[slug] ?? 0) : 0;
        if (weight > 0) {
          weightedSum += param.score * weight;
          weightApplied += weight;
        }
      }
      if (weightApplied > 0.5) {
        // Normalize: if weights sum to 1 (all 6 matched), this equals weightedSum
        const normalizedScore = weightedSum / Math.min(weightApplied, 1.0);
        analysisResult.overall_score = Math.round(Math.max(0, Math.min(100, normalizedScore)));
      } else {
        // Fallback: use Claude's value (cached v1 analyses / unexpected param names)
        analysisResult.overall_score = Math.round(Math.max(0, Math.min(100, analysisResult.overall_score)));
      }

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

    // 10. Increment analysis count ONLY after successful analysis
    if (subscription.isAuthenticated && subscription.userId) {
      try {
        const newCount = await incrementAnalysisCount(subscription.userId);
        const newRemaining = Math.max(0, subscription.limit - newCount);

        if (!subscription.isPremium) {
          analysisResult.remainingAnalyses = newRemaining;
        }

        console.log(`✅ Analysis count updated: ${subscription.analysisCount} → ${newCount} (remaining: ${newRemaining})`);

        // Fire-and-forget: email free user the moment they exhaust their 3 free analyses.
        // Condition is exact equality so this fires once — on the analysis that hits the cap,
        // not before and not on subsequent over-limit attempts (which are blocked upstream).
        if (!subscription.isPremium && newCount === subscription.limit) {
          (async () => {
            try {
              const clerk = await clerkClient();
              const user = await clerk.users.getUser(subscription.userId!);
              const email = user.emailAddresses[0]?.emailAddress;
              if (!email) {
                console.warn('⚠️ Free limit email skipped: no email found for user');
                return;
              }
              const firstName = user.firstName ?? 'there';
              const resend = new Resend(process.env.RESEND_API_KEY);
              const emailHtml = await render(FreeLimitReachedEmail({ firstName }));
              await resend.emails.send({
                from: 'LLM Check <analysis@llmcheck.app>',
                to: email,
                subject: "You've used all 3 free analyses",
                html: emailHtml,
              });
              console.log('📧 Free limit email sent');
            } catch (err) {
              console.error('Free limit email failed:', err);
            }
          })();
        }

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
          scoringVersion: 'v2',
        });
        console.log('✅ Analysis saved to database (scoring_version: v2)');
        analysisResult.id = savedAnalysis.id;
      } catch (dbError) {
        console.error('❌ Failed to save analysis to database:', dbError);
      }
    }

    return NextResponse.json({
      ...analysisResult,
      analyzed_at: new Date().toISOString(),
      ...(pageBlocked && { page_blocked: true, httpStatus: fetchStatus }),
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
