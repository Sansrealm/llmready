"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Eye, RefreshCw, Lock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/track-event";
import Link from "next/link";
import type { QueryBucket, CitationGap } from "@/lib/types";
import { getPrimaryCompetitor } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModelCell {
  found: boolean;
  snippet: string | null;
  cited?: boolean;
  citedUrls?: string[];  // source URLs the engine returned; absent on pre-migration cached scans
  error: boolean;
}

interface PromptResult {
  prompt: string;
  chatgpt: ModelCell;
  gemini: ModelCell;
  perplexity: ModelCell;
}

interface TrendPoint {
  score: number;
  total: number;
  date: string;
}

interface ScanResponse {
  cached: boolean;
  scannedAt: string;
  totalFound: number;
  totalQueries: number;
  results: PromptResult[];
  trend: TrendPoint[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ScanSummary {
  totalFound: number;
  totalQueries: number;
  buckets: { type: string; label: string; found: number; total: number }[];
  topCompetitor: string | null;
}

interface AiVisibilityCheckProps {
  url: string;
  industry: string | null;
  isSignedIn: boolean;
  isPremium: boolean;
  userEmail: string | null;
  userId: string | null;
  visibilityQueries?: string[];
  queryBuckets?: QueryBucket[];
  citationGaps?: CitationGap[];
  onScanLoading?: () => void;
  onScanStatusKnown?: (hasRun: boolean, hasCitationGaps: boolean, summary?: ScanSummary) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MODELS: { id: keyof Omit<PromptResult, "prompt">; label: string; color: string; dot: string }[] = [
  { id: "chatgpt",    label: "ChatGPT",    color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  { id: "gemini",     label: "Gemini",     color: "text-blue-600 dark:text-blue-400",       dot: "bg-blue-500"    },
  { id: "perplexity", label: "Perplexity", color: "text-violet-600 dark:text-violet-400",   dot: "bg-violet-500"  },
];

const BUCKET_ORDER = ["brand", "problem", "category", "comparison"] as const;
const BUCKET_LABELS: Record<string, string> = {
  brand:      "Brand",
  problem:    "Problem",
  category:   "Category",
  comparison: "Comparison",
};
const BUCKET_SUBTITLES: Record<string, string> = {
  brand:      "direct + feature queries",
  problem:    "need-based queries · 30% of AI searches",
  category:   "discovery queries · 25% of AI searches",
  comparison: "vs. competitor queries",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ModelBadge({ id, label, dot }: { id: string; label: string; dot: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function ResultCell({ cell }: { cell: ModelCell }) {
  if (cell.error) {
    return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>;
  }
  return cell.found ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
  ) : (
    <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return <>{days} day{days > 1 ? "s" : ""} ago</>;
  if (hours >= 1) return <>{hours} hour{hours > 1 ? "s" : ""} ago</>;
  return <>just now</>;
}

// ── Upgrade gate (non-premium) ────────────────────────────────────────────────

function UpgradeGate({ url }: { url: string }) {
  void url;
  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-1">
        <Eye className="h-5 w-5 text-indigo-500" />
        <h2 className="text-xl font-bold">AI Visibility Check</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        See if your brand shows up when customers ask ChatGPT, Gemini, or Perplexity
        about your products or services.
      </p>

      <div className="rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-6 text-center space-y-4">
        <Lock className="w-8 h-8 text-indigo-400 mx-auto" />
        <div className="space-y-1">
          <p className="font-semibold text-indigo-800 dark:text-indigo-200">
            Premium feature
          </p>
          <p className="text-sm text-indigo-600 dark:text-indigo-400 max-w-xs mx-auto">
            Upgrade to scan your brand across ChatGPT, Gemini, and Perplexity — and track
            your visibility over time.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/pricing">Upgrade to Premium</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ai-visibility" target="_blank">See a sample report</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type BucketStatus = "gap" | "partial" | "all-pass";

function getBucketStatus(rows: PromptResult[]): BucketStatus {
  let hasAnyMiss = false;
  for (const row of rows) {
    const misses = MODELS.filter(m => !row[m.id].error && !row[m.id].found).length;
    if (misses >= 2) return "gap";
    if (misses >= 1) hasAnyMiss = true;
  }
  return hasAnyMiss ? "partial" : "all-pass";
}

function heatmapPillClass(found: number, total: number): string {
  if (total === 0) return "";
  const ratio = found / total;
  if (ratio >= 0.8) return "bg-[#e6f5ee] text-[#1a7f4b]";
  if (ratio >= 0.4) return "bg-[#faeeda] text-[#854f0b]";
  return "bg-[#fcebeb] text-[#a32d2d]";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AiVisibilityCheck({
  url,
  industry,
  isPremium,
  visibilityQueries,
  queryBuckets,
  citationGaps,
  onScanLoading,
  onScanStatusKnown,
}: AiVisibilityCheckProps) {
  const [data, setData] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);
  const hasFetched = useRef(false);
  const hasInitializedExpanded = useRef(false);

  // Track view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true;
          trackEvent("ai_visibility_viewed", { industry: industry || "other", url });
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [industry, url]);

  // Auto-trigger scan for premium users on mount
  useEffect(() => {
    if (isPremium && !hasFetched.current) {
      hasFetched.current = true;
      triggerScan(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  // Initialize expanded buckets once data arrives
  useEffect(() => {
    if (!data || hasInitializedExpanded.current || !queryBuckets?.length) return;
    hasInitializedExpanded.current = true;
    const queryTypeMap = new Map(queryBuckets.map((b) => [b.query, b.type]));
    const expanded = new Set<string>();
    for (const type of BUCKET_ORDER) {
      const rows = data.results.filter(r => queryTypeMap.get(r.prompt) === type);
      if (rows.length === 0) continue;
      if (getBucketStatus(rows) !== "all-pass") expanded.add(type);
    }
    setExpandedBuckets(expanded);
  }, [data, queryBuckets]);

  async function triggerScan(isRescan: boolean) {
    if (isRescan) {
      setRescanning(true);
      hasInitializedExpanded.current = false;
    } else {
      setLoading(true);
    }
    setError(null);
    onScanLoading?.();

    try {
      const res = await fetch("/api/ai-visibility-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, industry: industry ?? "other", visibilityQueries }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scan failed");
      setData(json);

      const rows = json.results as PromptResult[];
      const hasCitationGaps = rows.some((r) => !r.perplexity.error && r.perplexity.cited === false);

      const queryTypeMap = new Map((queryBuckets ?? []).map((b) => [b.query, b.type]));
      const buckets = (["brand", "problem", "category", "comparison"] as const)
        .map((type) => {
          const bucketRows = rows.filter((r) => queryTypeMap.get(r.prompt) === type);
          const found = bucketRows.reduce((sum, r) =>
            sum +
            (r.chatgpt.error ? 0 : r.chatgpt.found ? 1 : 0) +
            (r.gemini.error ? 0 : r.gemini.found ? 1 : 0) +
            (r.perplexity.error ? 0 : r.perplexity.found ? 1 : 0), 0);
          const total = bucketRows.length * 3;
          return { type, label: { brand: "Brand", problem: "Problem", category: "Category", comparison: "Comparison" }[type], found, total };
        })
        .filter((b) => b.total > 0);

      let topCompetitor: string | null = null;
      for (const gap of citationGaps ?? []) {
        const c = getPrimaryCompetitor(gap);
        if (c) { topCompetitor = c; break; }
      }

      const summary: ScanSummary = { totalFound: json.totalFound, totalQueries: json.totalQueries, buckets, topCompetitor };
      onScanStatusKnown?.(true, hasCitationGaps, summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed. Please try again.");
      onScanStatusKnown?.(false, false);
    } finally {
      setLoading(false);
      setRescanning(false);
    }
  }

  // ── Non-premium: upgrade gate ───────────────────────────────────────────────
  if (!isPremium) {
    return (
      <div ref={sectionRef}>
        <UpgradeGate url={url} />
      </div>
    );
  }

  // ── Premium: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div ref={sectionRef} className="bg-white dark:bg-gray-950 rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold">AI Visibility Check</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            Scanning ChatGPT, Gemini, and Perplexity — this takes 10–15 seconds…
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Premium: error ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div ref={sectionRef} className="bg-white dark:bg-gray-950 rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold">AI Visibility Check</h2>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={() => triggerScan(false)}>
          Try again
        </Button>
      </div>
    );
  }

  // ── Premium: results ────────────────────────────────────────────────────────
  if (!data) return null;

  const visibilityPct = Math.round((data.totalFound / data.totalQueries) * 100);

  const queryTypeMap = new Map((queryBuckets ?? []).map((b) => [b.query, b.type]));
  const citationGapMap = new Map((citationGaps ?? []).map((g) => [g.query, g]));

  // Build per-bucket data (with raw result rows attached)
  const bucketData = BUCKET_ORDER.map((type) => {
    const rows = data.results.filter(r => queryTypeMap.get(r.prompt) === type);
    const perModel = MODELS.map((m) => {
      const found = rows.filter(r => r[m.id].found).length;
      let competitor: string | null = null;
      if (m.id === "perplexity") {
        for (const r of rows) {
          const gap = citationGapMap.get(r.prompt);
          if (gap && gap.status === "not_cited") {
            const c = getPrimaryCompetitor(gap);
            if (c) { competitor = c; break; }
          }
        }
      }
      return { modelId: m.id, found, total: rows.length, competitor };
    });
    return { type, label: BUCKET_LABELS[type] ?? type, perModel, rows };
  });

  const hasBucketData =
    queryBuckets &&
    queryBuckets.length > 0 &&
    bucketData.some((b) => b.perModel[0].total > 0);

  // Gap callout — worst model by miss count
  const missesPerModel = MODELS.map(m => ({
    ...m,
    missed: data.results.filter(r => !r[m.id].error && !r[m.id].found).length,
    missedBuckets: [...new Set(
      data.results
        .filter(r => !r[m.id].error && !r[m.id].found)
        .map(r => queryTypeMap.get(r.prompt))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
    )],
  }));
  const worstModel = [...missesPerModel].sort((a, b) => b.missed - a.missed)[0];
  const showGapCallout = hasBucketData && worstModel && worstModel.missed >= 2;

  // Sort groups: gap → partial → all-pass
  const sortedGroups = hasBucketData
    ? bucketData
        .filter(b => b.rows.length > 0)
        .map(b => ({ ...b, status: getBucketStatus(b.rows) }))
        .sort((a, b) => {
          const order: Record<BucketStatus, number> = { gap: 0, partial: 1, "all-pass": 2 };
          return order[a.status] - order[b.status];
        })
    : [];

  return (
    <div ref={sectionRef} className="bg-white dark:bg-gray-950 rounded-lg border">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold">AI Visibility Check</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>
            Scanned <RelativeTime iso={data.scannedAt} />
            {data.cached && " (cached)"}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.cached || rescanning}
            onClick={() => triggerScan(true)}
            className="h-7 text-xs"
          >
            {rescanning ? (
              <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Scanning…</>
            ) : (
              <><RefreshCw className="w-3 h-3 mr-1" /> Rescan</>
            )}
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Summary card */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            {/* Score — left */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-medium text-gray-900 dark:text-gray-50">{data.totalFound}</span>
                <span className="text-base text-gray-400">/ {data.totalQueries}</span>
                <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#e6f5ee] text-[#1a7f4b]">
                  {visibilityPct}% visibility
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">queries that cited your brand across all engines</p>
            </div>
            {/* Gap callout — right */}
            {showGapCallout && (
              <div className="text-xs text-[#854f0b] bg-[#faeeda] border border-[#ef9f27]/40 rounded-lg px-3 py-2 max-w-xs leading-relaxed">
                {worstModel.label} misses you on {worstModel.missed} of {data.totalQueries}{" "}
                {worstModel.missedBuckets.length > 0
                  ? worstModel.missedBuckets.map(b => BUCKET_LABELS[b] ?? b).join(" + ").toLowerCase() + " queries"
                  : "queries"}{" "}
                — the highest-traffic AI query types
              </div>
            )}
          </div>

          {/* Heatmap table */}
          {hasBucketData && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 w-[44%]">
                      Query type
                    </th>
                    {MODELS.map((m) => (
                      <th key={m.id} className="py-2 px-2 text-center">
                        <ModelBadge id={m.id} label={m.label} dot={m.dot} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bucketData.filter(b => b.perModel[0].total > 0).map((row) => (
                    <tr
                      key={row.type}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors cursor-pointer"
                      onClick={() => document.getElementById(`visibility-bucket-${row.type}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      <td className="py-2.5 pr-4 border-b border-gray-50 dark:border-gray-900/50">
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{row.label}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{BUCKET_SUBTITLES[row.type]}</div>
                      </td>
                      {row.perModel.map((cell) => (
                        <td key={cell.modelId} className="py-2.5 px-2 text-center border-b border-gray-50 dark:border-gray-900/50">
                          {cell.total === 0 ? (
                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                          ) : (
                            <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg font-mono text-xs font-medium ${heatmapPillClass(cell.found, cell.total)}`}>
                              {cell.found}/{cell.total}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Citation sources insight block */}
        {hasBucketData && (() => {
          // For each model, collect cited URLs from missed queries only
          const engineSources = MODELS.map((m) => {
            const missedRows = data.results.filter(r => !r[m.id].error && !r[m.id].found);
            const hasSearchData = data.results.some(r => !r[m.id].error && (r[m.id].citedUrls ?? []).length > 0);
            const allUrls = missedRows.flatMap(r => r[m.id].citedUrls ?? []);

            const domainCounts = new Map<string, number>();
            for (const url of allUrls) {
              try {
                const hostname = new URL(url).hostname.replace(/^www\./, '');
                if (hostname) domainCounts.set(hostname, (domainCounts.get(hostname) ?? 0) + 1);
              } catch { /* skip malformed URLs */ }
            }
            const topDomains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

            return { ...m, missedCount: missedRows.length, hasSearchData, topDomains };
          });

          // Citation presence score: % of missed model×query pairs that returned any source URLs
          const totalMissedCells = data.results.reduce((sum, r) =>
            sum + MODELS.filter(m => !r[m.id].error && !r[m.id].found).length, 0);
          const missedCellsWithUrls = data.results.reduce((sum, r) =>
            sum + MODELS.filter(m => !r[m.id].error && !r[m.id].found && (r[m.id].citedUrls ?? []).length > 0).length, 0);
          const citationPresencePct = totalMissedCells > 0
            ? Math.round((missedCellsWithUrls / totalMissedCells) * 100)
            : 0;

          // Only render if at least one engine has missed queries with citation data
          const anyUsefulData = engineSources.some(e => e.topDomains.length > 0);
          const hasMissedQueries = totalMissedCells > 0;
          if (!hasMissedQueries) return null;

          return (
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    On queries where you weren&apos;t cited, these sources were
                  </p>
                  {anyUsefulData && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {citationPresencePct}% of missed queries returned citation sources
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {engineSources.map((engine) => {
                  if (engine.missedCount === 0) return null;

                  if (!engine.hasSearchData) {
                    return (
                      <div key={engine.id} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-20 shrink-0">{engine.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">web search unavailable on this scan</span>
                      </div>
                    );
                  }

                  if (engine.topDomains.length === 0) {
                    return (
                      <div key={engine.id} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-20 shrink-0">{engine.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">no source URLs returned</span>
                      </div>
                    );
                  }

                  return (
                    <div key={engine.id} className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-20 shrink-0 pt-0.5">{engine.label}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {engine.topDomains.map(([domain, count]) => (
                          <span
                            key={domain}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          >
                            {domain}
                            {count > 1 && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">×{count}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 72hr cache note */}
        {data.cached && (
          <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-2">
            Showing results from <RelativeTime iso={data.scannedAt} />.
            LLMs can take up to 7 days to re-index changes made to your site —
            rescan will be available 72 hours after the last scan.
          </p>
        )}

        {hasBucketData ? (
          /* Collapsible query detail groups */
          <div className="space-y-2">
            {sortedGroups.map(({ type, label, rows, status }) => {
              const isExpanded = expandedBuckets.has(type);
              const missedRows = rows.filter(r => MODELS.some(m => !r[m.id].error && !r[m.id].found));
              const passingRows = rows.filter(r => !MODELS.some(m => !r[m.id].error && !r[m.id].found));
              const sortedRows = [...missedRows, ...passingRows];
              const gapCount = missedRows.length;

              return (
                <div key={type} id={`visibility-bucket-${type}`} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden scroll-mt-4">
                  {/* Group header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors text-left"
                    onClick={() => setExpandedBuckets(prev => {
                      const next = new Set(prev);
                      if (next.has(type)) next.delete(type); else next.add(type);
                      return next;
                    })}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label} queries</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{BUCKET_SUBTITLES[type]}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {status === "gap" && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#fcebeb] text-[#a32d2d]">
                          {gapCount} gap{gapCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {status === "partial" && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#faeeda] text-[#854f0b]">
                          {gapCount} gap{gapCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {status === "all-pass" && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#e6f5ee] text-[#1a7f4b]">
                          All passing
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {/* Query rows */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-900">
                      {sortedRows.map((row, i) => {
                        const missedByModels = MODELS.filter(m => !row[m.id].error && !row[m.id].found);
                        const isMissed = missedByModels.length > 0;
                        return (
                          <div
                            key={i}
                            className={`grid grid-cols-[1fr_auto] gap-3 items-center px-4 py-2.5 ${isMissed ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                          >
                            <p className={`text-xs leading-snug ${isMissed ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>
                              &ldquo;{row.prompt}&rdquo;
                            </p>
                            {isMissed ? (
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                <span className="text-[11px] text-gray-400 mr-0.5">missed by</span>
                                {missedByModels.map(m => (
                                  <span
                                    key={m.id}
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                      m.id === "chatgpt"    ? "bg-[#e6f1fb] text-[#0c447c]" :
                                      m.id === "gemini"     ? "bg-[#eaf3de] text-[#27500a]" :
                                                              "bg-[#eeedfe] text-[#3c3489]"
                                    }`}
                                  >
                                    {m.label}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#e6f5ee] flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#1a7f4b]" />
                                </div>
                                <span className="text-[11px] text-[#1a7f4b]">all engines</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback: old layout for cached scans without queryBuckets */
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/2">
                      AI Query
                    </th>
                    {MODELS.map((m) => (
                      <th key={m.id} className="py-2 px-3 text-center">
                        <ModelBadge id={m.id} label={m.label} dot={m.dot} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                  {data.results.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 text-sm leading-snug">
                        &ldquo;{row.prompt}&rdquo;
                      </td>
                      {MODELS.map((m) => (
                        <td key={m.id} className="py-3 px-3 text-center">
                          <ResultCell cell={row[m.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.results.every((r) => MODELS.every((m) => r[m.id].found === false)) && (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                No brand mentions were detected across ChatGPT, Gemini, or Perplexity for these queries.
                Your LLM Readiness score and Priority Action Plan below show where to start.
              </div>
            )}
          </>
        )}

        {/* Trend bars */}
        {data.trend.length >= 2 && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Visibility trend
            </p>
            <div className="flex items-end gap-2 h-10">
              {data.trend.map((point, i) => {
                const pct = Math.round((point.score / point.total) * 100);
                const pxH = Math.max(3, Math.round(40 * pct / 100));
                return (
                  <div key={i} className="flex-1 group relative flex flex-col justify-end">
                    <div
                      className="w-full bg-indigo-400 dark:bg-indigo-500 rounded-sm transition-all"
                      style={{ height: `${pxH}px` }}
                    />
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {point.score}/{point.total}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">
              {data.trend.length} scan{data.trend.length > 1 ? "s" : ""} — hover bars to see scores
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
