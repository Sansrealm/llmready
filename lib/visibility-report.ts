/**
 * Pure display helpers for the shared/printable AI Visibility report.
 *
 * Used by:
 *   - app/share/[slug]/page.tsx  (public share page)
 *   - app/api/generate-pdf       (download report)
 *
 * The on-screen results page (/results) computes these itself via
 * components/ai-visibility-check.tsx; we intentionally mirror its shape
 * here so the shared report matches the live page.
 */

import type { VisibilityResultRow } from './db';
import type { QueryBucket } from './types';

// ----------------------------------------------------------------------------
// Engine + query type constants — mirror components/ai-visibility-check.tsx
// ----------------------------------------------------------------------------

export const ENGINES = [
  { id: 'chatgpt',    label: 'ChatGPT' },
  { id: 'gemini',     label: 'Gemini' },
  { id: 'perplexity', label: 'Perplexity' },
] as const;

export type EngineId = typeof ENGINES[number]['id'];

export const QUERY_TYPE_ORDER = ['brand', 'problem', 'category', 'comparison'] as const;

export const QUERY_TYPE_LABELS: Record<string, string> = {
  brand: 'Brand',
  problem: 'Problem',
  category: 'Category',
  comparison: 'Comparison',
};

// ----------------------------------------------------------------------------
// Stats
// ----------------------------------------------------------------------------

export interface CitationStats {
  /** Total successful results (exclude rows where found/cited are unknown due to errors). */
  total: number;
  /** Rows where the engine cited the target site. */
  cited: number;
  /** cited / total in [0, 1]. Zero when total === 0. */
  rate: number;
  /** Per-engine breakdown. */
  byEngine: Array<{ id: EngineId; label: string; cited: number; total: number; rate: number }>;
  /** Per-query-type breakdown, ordered brand → problem → category → comparison, omitting empty buckets. */
  byQueryType: Array<{ type: string; label: string; cited: number; total: number; rate: number }>;
}

/**
 * Compute citation stats from the raw ai_visibility_results rows.
 *
 * We count a row as "cited" if either:
 *   - `cited === true` (Perplexity / ChatGPT with search tier returning source URLs), or
 *   - `found === true` (ChatGPT Tier 3 fallback where we detected a mention but no citation URLs)
 *
 * This matches how the live results page treats "appeared in AI answer" — so the
 * 90% on ramtrucks lines up across share page, PDF, and live page.
 */
export function computeCitationStats(
  results: VisibilityResultRow[],
  queryBuckets?: QueryBucket[] | null,
): CitationStats {
  const successful = results.filter((r) => !('error' in r) || !(r as unknown as { error?: boolean }).error);

  const total = successful.length;
  const cited = successful.filter((r) => r.cited === true || r.found === true).length;
  const rate = total > 0 ? cited / total : 0;

  // Per-engine
  const byEngine = ENGINES.map(({ id, label }) => {
    const engineRows = successful.filter((r) => r.model === id);
    const engineCited = engineRows.filter((r) => r.cited === true || r.found === true).length;
    const engineTotal = engineRows.length;
    return {
      id,
      label,
      cited: engineCited,
      total: engineTotal,
      rate: engineTotal > 0 ? engineCited / engineTotal : 0,
    };
  });

  // Per-query-type — requires queryBuckets to map prompt → type
  const queryTypeMap = new Map<string, string>();
  if (queryBuckets) {
    for (const b of queryBuckets) queryTypeMap.set(b.query, b.type);
  }

  const byQueryType = QUERY_TYPE_ORDER.map((type) => {
    const typeRows = successful.filter((r) => queryTypeMap.get(r.prompt) === type);
    const typeCited = typeRows.filter((r) => r.cited === true || r.found === true).length;
    const typeTotal = typeRows.length;
    return {
      type,
      label: QUERY_TYPE_LABELS[type] ?? type,
      cited: typeCited,
      total: typeTotal,
      rate: typeTotal > 0 ? typeCited / typeTotal : 0,
    };
  }).filter((r) => r.total > 0);

  return { total, cited, rate, byEngine, byQueryType };
}

// ----------------------------------------------------------------------------
// Verdict
// ----------------------------------------------------------------------------

export type VerdictTone = 'strong' | 'at-risk' | 'low' | 'critical';

export interface Verdict {
  label: string;
  tone: VerdictTone;
}

/**
 * Map a citation rate (0–1) to the verdict shown at the top of the report.
 *
 * Thresholds (hard-coded, aligned with product copy):
 *   ≥ 80%  → Strong Visibility   (tone: strong)
 *   60–79% → At Risk             (tone: at-risk)
 *   40–59% → Low Visibility      (tone: low)
 *   < 40%  → Critical: Not Cited (tone: critical)
 */
export function computeVerdict(rate: number): Verdict {
  const pct = rate * 100;
  if (pct >= 80) return { label: 'Strong Visibility',    tone: 'strong' };
  if (pct >= 60) return { label: 'At Risk',              tone: 'at-risk' };
  if (pct >= 40) return { label: 'Low Visibility',       tone: 'low' };
  return           { label: 'Critical: Not Cited',       tone: 'critical' };
}

/** Percentage rounded to a whole number for display (e.g. `90`). */
export function formatPct(rate: number): number {
  return Math.round(rate * 100);
}
