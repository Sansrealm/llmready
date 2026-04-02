/**
 * POST /api/ai-visibility-scan
 *
 * Runs an AI visibility scan across ChatGPT, Gemini, and Perplexity for a
 * given URL and industry. Premium users only.
 *
 * Cache: returns existing results if a scan for this URL exists within 72 hours.
 * Cost:  ~$0.04 per fresh scan (15 queries across 3 models).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPremiumStatus } from '@/lib/auth-utils';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 120;
import { runVisibilityScan } from '@/lib/ai-visibility-scan';
import {
  getLatestVisibilityScan,
  saveVisibilityScan,
  getVisibilityScanHistory,
  updateAnalysisCitationData,
  normalizeUrl,
  type VisibilityResultRow,
} from '@/lib/db';
import type { CitationGap, QueryBucket } from '@/lib/types';

const CACHE_MAX_AGE_HOURS = 72;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Single batched Haiku call — all snippets in one request, one JSON array response.
 * Returns a map of `${query}|||${model}` → array of all brand names mentioned in that response.
 * The target brand is excluded server-side via the prompt.
 */
async function extractMentionedBrands(
  items: Array<{ model: string; query: string; snippet: string }>,
  targetBrandName: string,
  targetDomain: string,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (items.length === 0) return map;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: 'Return only valid JSON. No markdown, no explanation.',
    messages: [{
      role: 'user',
      content: `You are analyzing AI search responses to identify every brand, product, or service explicitly recommended.

The brand being analyzed is: ${targetBrandName} (${targetDomain}). Do not include this brand in your output.

For each response, return ALL brand/product names that are recommended as solutions, sorted by prominence in the response.

Rules:
- Return brand names as commonly written (e.g. "HubSpot", "Salesforce", "Notion")
- Return empty array [] if no specific products are named
- Do not include: ${targetBrandName}, ${targetDomain}, or any variation of these
- Exclude generic aggregators and content platforms: Reddit, YouTube, Wikipedia, LinkedIn, Twitter, Forbes, TechCrunch, G2, Capterra, Trustpilot
- Maximum 8 brands per response

Snippets:
${JSON.stringify(items.map((it, i) => ({ id: i, model: it.model, query: it.query, snippet: it.snippet.slice(0, 400) })))}

Return a JSON array: [{"id": 0, "brands": ["Brand1", "Brand2"]}, ...]`,
    }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const parsed: Array<{ id: number; brands: string[] }> = JSON.parse(
    raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  );

  for (const entry of parsed) {
    const item = items[entry.id];
    if (item) map.set(`${item.query}|||${item.model}`, entry.brands ?? []);
  }
  return map;
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth: premium only ──────────────────────────────────────────────────
    const { isPremium, userId } = await checkPremiumStatus();
    if (!isPremium || !userId) {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { url, industry, visibilityQueries, queryBuckets } = body as {
      url: string;
      industry?: string;
      visibilityQueries?: string[];
      queryBuckets?: QueryBucket[];
    };

    if (!url?.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // ── Cache check ─────────────────────────────────────────────────────────
    const cached = await getLatestVisibilityScan(url, CACHE_MAX_AGE_HOURS);

    if (cached) {
      const history = await getVisibilityScanHistory(url);
      return NextResponse.json({
        cached: true,
        scannedAt: cached.scan.scanned_at,
        totalFound: cached.scan.total_found,
        totalQueries: cached.scan.total_queries,
        results: formatResults(cached.results),
        trend: buildTrend(history),
      });
    }

    // ── Fresh scan ──────────────────────────────────────────────────────────
    const scan = await runVisibilityScan(url, industry ?? null, visibilityQueries);

    // ── Brand extraction: single batched Haiku call across all snippets ──────
    // Runs before the DB save so mentioned_brands is written on the first insert.
    let brandsMap = new Map<string, string[]>();
    let targetBrandName = '';
    let targetDomain = '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      targetDomain = parsed.hostname.replace(/^www\./, '');
      targetBrandName = targetDomain.split('.')[0];
    } catch { /* keep empty strings */ }

    try {
      const allSnippets = scan.results
        .filter((r) => !r.error && r.snippet)
        .map((r) => ({ model: r.model, query: r.prompt, snippet: r.snippet! }));

      if (allSnippets.length > 0) {
        brandsMap = await extractMentionedBrands(allSnippets, targetBrandName, targetDomain);
        console.log(`[ai-visibility-scan] brand extraction complete — ${brandsMap.size} results`);
      }
    } catch (extractErr) {
      console.error('[ai-visibility-scan] brand extraction failed (non-fatal):', extractErr);
    }

    // Attach mentionedBrands to each result before saving
    const enrichedResults = scan.results.map((r) => ({
      ...r,
      mentionedBrands: brandsMap.get(`${r.prompt}|||${r.model}`) ?? [],
    }));

    // ── Save to DB ───────────────────────────────────────────────────────────
    await saveVisibilityScan(
      url,
      industry ?? null,
      scan.totalFound,
      scan.totalQueries,
      enrichedResults.filter((r) => !r.error),
      queryBuckets ?? null
    );

    // ── Derive citation gaps and write back to analyses (existing path) ──────
    if (userId) {
      try {
        const perplexityResults = enrichedResults.filter(
          (r) => r.model === 'perplexity' && !r.error
        );

        if (perplexityResults.length > 0) {
          const citedCount = perplexityResults.filter((r) => r.cited === true).length;
          const citationRate = citedCount / perplexityResults.length;

          const queryTypeMap = new Map<string, string>();
          if (queryBuckets) {
            for (const b of queryBuckets) queryTypeMap.set(b.query, b.type);
          }

          // Build CitationGap using first extracted brand as the single competitor
          // (backward-compatible: CitationGap.competitors_mentioned stays as string | null)
          const citationGaps: CitationGap[] = perplexityResults.map((r) => {
            const competitors_mentioned = (['chatgpt', 'gemini', 'perplexity'] as const)
              .flatMap((model) => {
                const brands = brandsMap.get(`${r.prompt}|||${model}`);
                if (brands === undefined) return [];
                return [{ model, competitor: brands[0] ?? null }];
              });

            return {
              query: r.prompt,
              query_type: queryTypeMap.get(r.prompt) ?? '',
              status: r.cited ? 'cited' : 'not_cited',
              citation_position: r.cited ? 1 : null,
              displaced_by: [],
              competitors_mentioned,
            } as CitationGap;
          });

          const citationDataQuality: 'sufficient' | 'insufficient' =
            perplexityResults.length < 10 ? 'insufficient' : 'sufficient';

          await updateAnalysisCitationData(userId, normalizeUrl(url), {
            citationRate,
            citationGaps,
            citationDataQuality,
          });

          console.log(
            `[ai-visibility-scan] citation data written — rate: ${(citationRate * 100).toFixed(0)}%, gaps: ${citationGaps.length}`
          );
        }
      } catch (citErr) {
        console.error('[ai-visibility-scan] citation backfill failed (non-fatal):', citErr);
      }
    }

    const history = await getVisibilityScanHistory(url);

    return NextResponse.json({
      cached: false,
      scannedAt: scan.scannedAt.toISOString(),
      totalFound: scan.totalFound,
      totalQueries: scan.totalQueries,
      results: formatResults(
        enrichedResults.map((r) => ({
          model: r.model,
          prompt: r.prompt,
          found: r.found,
          snippet: r.snippet,
          prominence: r.prominence ?? null,
          cited: r.cited,
          cited_urls: r.citedUrls,
          mentioned_brands: r.mentionedBrands,
          score: r.score ?? null,
        }))
      ),
      trend: buildTrend(history),
    });
  } catch (error) {
    console.error('[ai-visibility-scan] error:', error);
    return NextResponse.json(
      { error: 'Scan failed. Please try again.' },
      { status: 500 }
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type RawResult = Pick<VisibilityResultRow, 'model' | 'prompt' | 'found' | 'snippet' | 'prominence' | 'cited' | 'cited_urls' | 'mentioned_brands' | 'score'>;

/**
 * Groups flat result rows into a prompt-keyed structure:
 * { prompt, chatgpt: {...}, gemini: {...}, perplexity: {...} }[]
 */
function formatResults(rows: RawResult[]) {
  const promptMap = new Map<
    string,
    { chatgpt: RawResult | null; gemini: RawResult | null; perplexity: RawResult | null }
  >();

  for (const row of rows) {
    if (!promptMap.has(row.prompt)) {
      promptMap.set(row.prompt, { chatgpt: null, gemini: null, perplexity: null });
    }
    const entry = promptMap.get(row.prompt)!;
    if (row.model === 'chatgpt') entry.chatgpt = row;
    if (row.model === 'gemini') entry.gemini = row;
    if (row.model === 'perplexity') entry.perplexity = row;
  }

  return Array.from(promptMap.entries()).map(([prompt, models]) => ({
    prompt,
    chatgpt: modelCell(models.chatgpt),
    gemini: modelCell(models.gemini),
    perplexity: modelCell(models.perplexity),
  }));
}

function modelCell(row: RawResult | null) {
  if (!row) return { found: false, snippet: null, prominence: null, cited: false, citedUrls: [], mentionedBrands: [], score: null, error: true };
  return {
    found: row.found,
    snippet: row.snippet ?? null,
    prominence: row.prominence ?? null,
    cited: row.cited,
    citedUrls: row.cited_urls ?? [],
    mentionedBrands: row.mentioned_brands ?? [],
    score: row.score ?? null,
    error: false,
  };
}

/**
 * Builds a minimal trend array from scan history headers.
 * Used by the UI to show a "visibility over time" line.
 */
function buildTrend(
  history: Array<{ total_found: number; total_queries: number; scanned_at: string }>
) {
  return history.map((h) => ({
    score: h.total_found,
    total: h.total_queries,
    date: h.scanned_at,
  }));
}
