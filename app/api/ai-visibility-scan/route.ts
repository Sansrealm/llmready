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
import { runVisibilityScan } from '@/lib/ai-visibility-scan';
import {
  getLatestVisibilityScan,
  saveVisibilityScan,
  getVisibilityScanHistory,
  type VisibilityResultRow,
} from '@/lib/db';

const CACHE_MAX_AGE_HOURS = 72;

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
    const { url, industry, visibilityQueries } = body as {
      url: string;
      industry?: string;
      visibilityQueries?: string[];
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

    // Save to DB (only non-error results to keep data clean)
    await saveVisibilityScan(
      url,
      industry ?? null,
      scan.totalFound,
      scan.totalQueries,
      scan.results.filter((r) => !r.error)
    );

    const history = await getVisibilityScanHistory(url);

    return NextResponse.json({
      cached: false,
      scannedAt: scan.scannedAt.toISOString(),
      totalFound: scan.totalFound,
      totalQueries: scan.totalQueries,
      results: formatResults(
        scan.results.map((r) => ({
          model: r.model,
          prompt: r.prompt,
          found: r.found,
          snippet: r.snippet,
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

type RawResult = Pick<VisibilityResultRow, 'model' | 'prompt' | 'found' | 'snippet'>;

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
  if (!row) return { found: false, snippet: null, error: true };
  return { found: row.found, snippet: row.snippet ?? null, error: false };
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
