/**
 * Public Share Page — app/share/[slug]/page.tsx
 *
 * Layout leads with AI Visibility (real citation data from ChatGPT / Gemini /
 * Perplexity), mirroring the live /results page. Structural AI Readiness score
 * is a supporting section below the fold.
 *
 * Three-tier visibility model:
 *   isGuest          — not signed in: visibility hero + engine/query-type
 *                      breakdowns + structural section visible; recs + trend
 *                      gated.
 *   isFreeUser       — signed in but not owner/premium: same as guest + recs.
 *   isOwnerOrPremium — owner or premium: all visible; trend links to full
 *                      report in dashboard.
 *
 * Pre-scan fallback: if the URL has no visibility scan yet, show a banner and
 * fall back to the structural-led layout.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { SiteMetric, Recommendation, CitationGap, QueryBucket } from '@/lib/types';
import {
  getAnalysisByShareSlug,
  getLatestVisibilityScanAnyAge,
  type VisibilityResultRow,
} from '@/lib/db';
import {
  computeCitationStats,
  computeVerdict,
  computeParamContribution,
  formatPct,
  ENGINES,
  type VerdictTone,
} from '@/lib/visibility-report';
import { Lock, CheckCircle2, XCircle } from 'lucide-react';
import { auth, currentUser } from '@clerk/nextjs/server';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface SharedAnalysis {
  id: string;
  user_id: string;
  url: string;
  overall_score: number;
  parameters: SiteMetric[];
  analyzed_at: string;
  shared_at?: string | null;
  share_expires_at?: string | null;
  recommendations?: Recommendation[] | null;
  citation_gaps?: CitationGap[] | null;
  query_buckets?: QueryBucket[] | null;
}

async function getSharedAnalysis(slug: string): Promise<SharedAnalysis | null> {
  try {
    const analysis = await getAnalysisByShareSlug(slug);
    if (!analysis) return null;
    return {
      id: analysis.id,
      user_id: analysis.user_id,
      url: analysis.url,
      overall_score: analysis.overall_score,
      parameters: analysis.parameters,
      analyzed_at: analysis.analyzed_at,
      shared_at: analysis.shared_at,
      share_expires_at: analysis.share_expires_at,
      recommendations: analysis.recommendations ?? null,
      citation_gaps: analysis.citation_gaps ?? null,
      query_buckets: analysis.query_buckets ?? null,
    };
  } catch (error) {
    console.error('Error fetching shared analysis:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const analysis = await getSharedAnalysis(slug);

  if (!analysis) {
    return {
      title: 'Share Link Not Found - LLM Check',
      description: 'This share link may have expired or does not exist.',
    };
  }

  let domain = analysis.url;
  try {
    const u = analysis.url.startsWith('http') ? analysis.url : `https://${analysis.url}`;
    domain = new URL(u).hostname.replace(/^www\./, '');
  } catch { /* use raw url */ }

  // Prefer the real citation rate for the OG description when we have it.
  const scan = await getLatestVisibilityScanAnyAge(analysis.url).catch(() => null);
  const hasScan = !!scan && scan.results.length > 0;
  const stats = hasScan ? computeCitationStats(scan!.results, analysis.query_buckets) : null;

  const visibilityLine = stats && stats.total > 0
    ? `${stats.cited}/${stats.total} citations across ChatGPT, Gemini, and Perplexity (${formatPct(stats.rate)}%)`
    : `Scored ${analysis.overall_score}/100 on AI readiness`;

  return {
    title: `${domain} — AI Visibility Audit | LLM Check`,
    description: `${domain} — ${visibilityLine}. See how your brand shows up in AI search.`,
    openGraph: {
      title: `${domain} — AI Visibility Audit`,
      description: visibilityLine,
      type: 'website',
      siteName: 'LLM Check',
      url: `https://llmcheck.app/share/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${domain} — AI Visibility Audit`,
      description: visibilityLine,
    },
  };
}

// ── Score / tone helpers ─────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-500 dark:text-amber-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-green-600';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-600';
}

function verdictColor(tone: VerdictTone) {
  switch (tone) {
    case 'strong':   return 'text-green-500';
    case 'at-risk':  return 'text-amber-400';
    case 'low':      return 'text-orange-400';
    case 'critical': return 'text-red-500';
  }
}

function rateBarColor(rate: number) {
  if (rate >= 0.8) return 'bg-green-500';
  if (rate >= 0.6) return 'bg-amber-500';
  if (rate >= 0.4) return 'bg-orange-500';
  return 'bg-red-500';
}

// ── Per-query aggregate across engines ───────────────────────────────────────

/**
 * Group visibility results by prompt and record which engines cited the site.
 * Returns one row per query with a `citedBy` set.
 */
function buildPerQueryRows(
  results: VisibilityResultRow[],
  queryBuckets: QueryBucket[] | null | undefined,
) {
  const queryTypeMap = new Map<string, string>();
  if (queryBuckets) for (const b of queryBuckets) queryTypeMap.set(b.query, b.type);

  const byQuery = new Map<string, { prompt: string; queryType: string; citedBy: string[]; totalEngines: number }>();
  for (const r of results) {
    const cited = r.cited === true || r.found === true;
    const existing = byQuery.get(r.prompt);
    if (existing) {
      if (cited) existing.citedBy.push(r.model);
      existing.totalEngines += 1;
    } else {
      byQuery.set(r.prompt, {
        prompt: r.prompt,
        queryType: queryTypeMap.get(r.prompt) ?? '',
        citedBy: cited ? [r.model] : [],
        totalEngines: 1,
      });
    }
  }
  return [...byQuery.values()];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { slug } = await params;
  const analysis = await getSharedAnalysis(slug);

  if (!analysis) notFound();

  // Auth tier
  const { userId } = await auth();
  const isOwner = !!userId && userId === analysis.user_id;
  let isPremium = false;
  if (userId && !isOwner) {
    const user = await currentUser();
    isPremium = user?.publicMetadata?.premiumUser === true;
  }
  const isGuest          = !userId;
  const isFreeUser       = !!userId && !isOwner && !isPremium;
  const isOwnerOrPremium = isOwner || isPremium;

  // Domain
  let domain = analysis.url;
  try {
    const u = analysis.url.startsWith('http') ? analysis.url : `https://${analysis.url}`;
    domain = new URL(u).hostname.replace(/^www\./, '');
  } catch { /* use raw url */ }

  // Visibility scan data — separate DB read; may be null for pre-scan analyses
  const scan = await getLatestVisibilityScanAnyAge(analysis.url).catch((err) => {
    console.error('[share] visibility scan fetch failed:', err);
    return null;
  });

  const citationGaps = analysis.citation_gaps ?? [];
  const hasScan = !!scan && scan.results.length > 0;
  // Fallback trigger per design intent: pre-scan analyses have no citation data
  const usesFallback = !hasScan || citationGaps.length === 0;

  const stats = hasScan ? computeCitationStats(scan!.results, analysis.query_buckets) : null;
  const verdict = stats ? computeVerdict(stats.rate) : null;
  const perQueryRows = hasScan ? buildPerQueryRows(scan!.results, analysis.query_buckets) : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Shared report banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 py-3">
        <div className="container px-4 mx-auto">
          <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <span>📊</span>
            <span>Shared AI Visibility Audit — generated by <strong>llmcheck.app</strong></span>
          </p>
        </div>
      </div>

      <main className="container px-4 py-10 mx-auto max-w-4xl space-y-8">

        {/* Guest CTA */}
        {isGuest && (
          <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">See how your site performs</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Analyse your site for free</p>
            </div>
            <Link href="/">
              <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0">
                Run Your Own Analysis →
              </Button>
            </Link>
          </div>
        )}

        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-2">
            AI Visibility Audit
          </p>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            {domain}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 break-all">{analysis.url}</p>
        </div>

        {/* ── PRE-SCAN FALLBACK PATH ─────────────────────────────────────── */}
        {usesFallback && (
          <>
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Heads up:</strong> This report was generated before AI citation scanning was
                available. Re-analyse {domain} to get full citation data across ChatGPT, Gemini, and
                Perplexity.
              </p>
            </div>

            {/* Structural hero (legacy) */}
            <div className="p-8 bg-gradient-to-br from-gray-950 to-gray-900 rounded-2xl border border-gray-800 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
                AI Readiness Score
              </p>
              <div className={`text-7xl font-black leading-none mb-2 ${scoreColor(analysis.overall_score)}`}>
                {analysis.overall_score}
                <span className="text-3xl text-gray-600 font-bold">/100</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Structural and markup readiness for AI crawlers
              </p>
              <div className="mt-5 w-full max-w-sm mx-auto bg-gray-800 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${scoreBarColor(analysis.overall_score)}`}
                  style={{ width: `${analysis.overall_score}%` }}
                />
              </div>
            </div>

            {/* Parameters */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Readiness breakdown
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.parameters.map((param, i) => {
                  const c = computeParamContribution(param.name, param.score);
                  return (
                    <div key={i} className="p-4 bg-card rounded-xl border border-border">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-sm">{param.name}</h3>
                        <span className={`text-base font-bold ${scoreColor(param.score)}`}>
                          {c ? <>{c.contribution} <span className="text-xs font-normal text-gray-400">/ {c.max} pts</span></> : param.score}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                        <div
                          className={`h-1.5 rounded-full ${scoreBarColor(param.score)}`}
                          style={{ width: `${param.score}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {param.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── PRIMARY PATH (scan available) ──────────────────────────────── */}
        {!usesFallback && stats && verdict && (
          <>
            {/* Visibility hero */}
            <div className="p-8 bg-gradient-to-br from-gray-950 to-gray-900 rounded-2xl border border-gray-800 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
                AI Visibility
              </p>
              <div className="text-7xl font-black leading-none mb-2 text-white">
                {stats.cited}
                <span className="text-3xl text-gray-500 font-bold">/{stats.total}</span>
              </div>
              <p className="text-2xl font-bold text-gray-200 mt-2">
                {formatPct(stats.rate)}% cited
              </p>
              <p className={`text-lg font-bold mt-3 ${verdictColor(verdict.tone)}`}>
                {verdict.label}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Across ChatGPT, Gemini, and Perplexity · {(scan?.scan.total_queries ?? 20)} customer queries
              </p>
              <div className="mt-5 w-full max-w-sm mx-auto bg-gray-800 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${rateBarColor(stats.rate)}`}
                  style={{ width: `${formatPct(stats.rate)}%` }}
                />
              </div>
            </div>

            {/* Engine breakdown */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                By AI engine
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                How often each engine cited {domain} across your customer queries
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {stats.byEngine.map((e) => (
                  <div key={e.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {e.label}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {e.cited}<span className="text-xs text-gray-400">/{e.total}</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-1">
                      <div
                        className={`h-2 rounded-full ${rateBarColor(e.rate)}`}
                        style={{ width: `${formatPct(e.rate)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPct(e.rate)}% cited
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Query-type breakdown */}
            {stats.byQueryType.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  By query type
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Visibility across brand, problem, category, and comparison searches
                </p>
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Query type
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Cited
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                      {stats.byQueryType.map((row) => (
                        <tr key={row.type} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                            {row.label}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-900 dark:text-white">
                            {row.cited}<span className="text-xs font-normal text-gray-400">/{row.total}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${rateBarColor(row.rate)}`}
                                  style={{ width: `${formatPct(row.rate)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 min-w-[40px]">
                                {formatPct(row.rate)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Per-query mention list with engine badges */}
            {perQueryRows.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  How {domain} appears in AI search
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Which engines cited your site for each customer query
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {perQueryRows.map((row, i) => {
                    const anyCited = row.citedBy.length > 0;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-4 py-3"
                      >
                        <div className="shrink-0 mt-0.5">
                          {anyCited ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{row.prompt}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {row.queryType && (
                              <span className="text-xs text-gray-400 capitalize">{row.queryType}</span>
                            )}
                            {anyCited ? (
                              <span className="text-xs text-gray-400">
                                · Cited by {row.citedBy
                                  .map((m) => ENGINES.find((e) => e.id === m)?.label ?? m)
                                  .join(', ')}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">· Not cited</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Recommendations — free + owner/premium see real; guests blurred */}
        {isOwnerOrPremium || isFreeUser ? (
          analysis.recommendations && analysis.recommendations.length > 0 ? (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Recommendations
              </h2>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 bg-card">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{rec.title}</h3>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        rec.impact === 'High'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : rec.impact === 'Medium'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                        {rec.impact.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Recommendations
            </h2>
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <div className="blur-sm pointer-events-none select-none p-5 space-y-3" aria-hidden="true">
                {[
                  { label: 'HIGH', text: 'Add FAQ schema markup to top pages' },
                  { label: 'HIGH', text: 'Rewrite meta descriptions for AI clarity' },
                  { label: 'MED',  text: 'Add author credentials and bio page' },
                  { label: 'MED',  text: 'Implement structured data for products' },
                  { label: 'LOW',  text: 'Create a dedicated About page with company details' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                      item.label === 'HIGH'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : item.label === 'MED'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                      {item.label}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                <Lock className="w-6 h-6 text-indigo-500" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Sign up free to see recommendations
                </p>
                <Link href="/login">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Sign up free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Supporting: AI Readiness (structural) — only on non-fallback path.
            Heading flips based on how the site is doing: "extend" framing for
            strong-visibility sites (>=60% cited), "why could be higher" for
            sites that need to climb out of a gap. */}
        {!usesFallback && stats && (
          <div>
            <div className="flex items-baseline justify-between gap-4 mb-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.rate >= 0.6
                  ? 'How to extend your visibility further'
                  : 'Why your score could be even higher'}
              </h2>
              <span className={`text-2xl font-bold ${scoreColor(analysis.overall_score)}`}>
                {analysis.overall_score}
                <span className="text-sm font-normal text-gray-400">/100</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Structural and markup signals that make content easier for AI models to parse
              and cite. Each card shows how many points the parameter contributes toward the
              100-point total — the levers to pull to lift the visibility numbers above.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.parameters.map((param, i) => {
                const c = computeParamContribution(param.name, param.score);
                return (
                  <div key={i} className="p-4 bg-card rounded-xl border border-border">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-sm">{param.name}</h3>
                      <span className={`text-base font-bold ${scoreColor(param.score)}`}>
                        {c ? <>{c.contribution} <span className="text-xs font-normal text-gray-400">/ {c.max} pts</span></> : param.score}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                      <div
                        className={`h-1.5 rounded-full ${scoreBarColor(param.score)}`}
                        style={{ width: `${param.score}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {param.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trend — blurred for guests + free, omitted for owner/premium (no data on share) */}
        {!isOwnerOrPremium && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Visibility Trend
            </h2>
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <div className="blur-sm pointer-events-none select-none p-5" aria-hidden="true">
                <div className="flex items-end gap-2 h-16">
                  {[40, 55, 45, 60, 52, 65, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-indigo-200 dark:bg-indigo-800 rounded-sm"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">7 scans — hover bars to see scores</p>
              </div>
              <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                <Lock className="w-6 h-6 text-indigo-500" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {isGuest ? 'Sign up free to see trends' : 'Upgrade to Pro to see trends'}
                </p>
                <Link href={isGuest ? '/login' : '/pricing'}>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isGuest ? 'Sign up free' : 'Upgrade to Pro'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        {isGuest ? (
          <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              See how your site compares
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Run a free analysis on your own site. No account required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8">
                  Run Your Own Analysis →
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Create Free Account</Button>
              </Link>
            </div>
          </div>
        ) : isFreeUser ? (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-gray-900 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Unlock full AI visibility tracking
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Upgrade to Pro to track these visibility numbers over time and see which
              competitors are displacing you.
            </p>
            <Link href="/pricing">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8">
                Upgrade to Pro →
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              This is a shared snapshot. For live trend data and competitor tracking, view the full
              report in your dashboard.
            </p>
            <Link href="/results">
              <Button variant="outline">View Full Report →</Button>
            </Link>
          </div>
        )}

        {/* Analyzed date */}
        <p className="text-xs text-muted-foreground text-center">
          Analyzed on{' '}
          {new Date(analysis.analyzed_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
          {analysis.share_expires_at && (
            <> · Expires {new Date(analysis.share_expires_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}</>
          )}
        </p>

      </main>

      <Footer />
    </div>
  );
}
