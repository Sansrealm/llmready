"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Eye, RefreshCw, TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/track-event";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModelCell {
  found: boolean;
  snippet: string | null;
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

interface AiVisibilityCheckProps {
  url: string;
  industry: string | null;
  isSignedIn: boolean;
  isPremium: boolean;
  userEmail: string | null;
  userId: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MODELS: { id: keyof Omit<PromptResult, "prompt">; label: string; color: string; dot: string }[] = [
  { id: "chatgpt",    label: "ChatGPT",    color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  { id: "gemini",     label: "Gemini",     color: "text-blue-600 dark:text-blue-400",       dot: "bg-blue-500"    },
  { id: "perplexity", label: "Perplexity", color: "text-violet-600 dark:text-violet-400",   dot: "bg-violet-500"  },
];

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

// ── Main component ────────────────────────────────────────────────────────────

export default function AiVisibilityCheck({
  url,
  industry,
  isSignedIn,
  isPremium,
}: AiVisibilityCheckProps) {
  const [data, setData] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);
  const hasFetched = useRef(false);

  // Extract display domain
  let domain = url;
  try {
    domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch { /* keep original */ }

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

  async function triggerScan(isRescan: boolean) {
    if (isRescan) setRescanning(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-visibility-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, industry: industry ?? "other" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scan failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed. Please try again.");
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
          {/* Skeleton rows */}
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
  const canRescan = !data.cached; // cached means within 72hrs — rescan disabled
  const snippets = data.results.flatMap((row) =>
    MODELS.flatMap((m) => {
      const cell = row[m.id];
      if (!cell.found || !cell.snippet) return [];
      return [{ model: m, prompt: row.prompt, snippet: cell.snippet }];
    })
  );

  const perModelScores = MODELS.map((m) => ({
    ...m,
    found: data.results.filter((r) => r[m.id].found).length,
    total: data.results.length,
  }));

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

        {/* Score summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Overall */}
          <div className="sm:col-span-1 space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Overall</p>
            <p className="text-3xl font-bold">
              {data.totalFound}
              <span className="text-lg font-normal text-gray-400">/{data.totalQueries}</span>
            </p>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${visibilityPct >= 60 ? "bg-emerald-400" : visibilityPct >= 30 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${visibilityPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{visibilityPct}% visibility</p>
          </div>

          {/* Per-model */}
          {perModelScores.map((m) => (
            <div key={m.id} className="space-y-1">
              <ModelBadge id={m.id} label={m.label} dot={m.dot} />
              <p className="text-3xl font-bold">
                {m.found}
                <span className="text-lg font-normal text-gray-400">/{m.total}</span>
              </p>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.dot}`}
                  style={{ width: `${Math.round((m.found / m.total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 72hr cache note */}
        {data.cached && (
          <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-2">
            Showing results from <RelativeTime iso={data.scannedAt} />.
            LLMs can take up to 7 days to re-index changes made to your site —
            rescan will be available 72 hours after the last scan.
          </p>
        )}

        {/* Results grid */}
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

        {/* Snippets */}
        {snippets.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Where {domain} was mentioned
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {snippets.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4 space-y-1.5"
                >
                  <ModelBadge id={s.model.id} label={s.model.label} dot={s.model.dot} />
                  <p className="text-xs text-gray-400 italic">&ldquo;{s.prompt}&rdquo;</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {s.snippet}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trend */}
        {data.trend.length >= 2 && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Visibility trend
            </p>
            <div className="flex items-end gap-2 h-10">
              {data.trend.map((point, i) => {
                const pct = Math.round((point.score / point.total) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-indigo-400 dark:bg-indigo-500 rounded-sm transition-all"
                      style={{ height: `${Math.max(4, pct)}%` }}
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
