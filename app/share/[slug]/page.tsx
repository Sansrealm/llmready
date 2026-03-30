/**
 * Public Share Page — app/share/[slug]/page.tsx
 *
 * Three-tier visibility model:
 *   isGuest          — not signed in: score + params + citation data visible; recs/AI visibility/trend gated
 *   isFreeUser       — signed in but not owner/premium: same as guest but recommendations visible
 *   isOwnerOrPremium — owner or premium subscriber: all visible (AI visibility/trend link to full report)
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { SiteMetric, Recommendation, CitationGap, QueryBucket, getPrimaryCompetitor } from '@/lib/types';
import { getAnalysisByShareSlug } from '@/lib/db';
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

  return {
    title: `${domain} — AI Citation Audit | LLM Check`,
    description: `${domain} scored ${analysis.overall_score}/100 on AI visibility. See what's holding it back from being recommended by ChatGPT, Gemini, and Perplexity.`,
    openGraph: {
      title: `${domain} scored ${analysis.overall_score}/100 on AI visibility`,
      description: `AI Citation Audit by LLM Check. See what's blocking ${domain} from AI recommendations.`,
      type: 'website',
      siteName: 'LLM Check',
      url: `https://llmcheck.app/share/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${domain} scored ${analysis.overall_score}/100 on AI visibility`,
      description: `AI Citation Audit by LLM Check. See what's blocking ${domain} from AI recommendations.`,
    },
  };
}

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

function verdict(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Strong AI Readiness',    color: 'text-green-600 dark:text-green-400' };
  if (score >= 60) return { label: 'At Risk: Citation Gap',  color: 'text-amber-500 dark:text-amber-400' };
  if (score >= 40) return { label: 'Critical: Citation Gap', color: 'text-orange-600 dark:text-orange-400' };
  return            { label: 'Critical: Not Cited',          color: 'text-red-600 dark:text-red-400' };
}

const BUCKET_ORDER = ['brand', 'problem', 'category', 'comparison'] as const;
const BUCKET_LABELS: Record<string, string> = {
  brand: 'Brand',
  problem: 'Problem',
  category: 'Category',
  comparison: 'Comparison',
};

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { slug } = await params;
  const analysis = await getSharedAnalysis(slug);

  if (!analysis) notFound();

  // ── Auth tier ─────────────────────────────────────────────────────────────
  const { userId } = await auth();
  const isOwner = !!userId && userId === analysis.user_id;
  let isPremium = false;
  if (userId && !isOwner) {
    const user = await currentUser();
    isPremium = user?.publicMetadata?.premiumUser === true;
  }

  const isGuest         = !userId;
  const isFreeUser      = !!userId && !isOwner && !isPremium;
  const isOwnerOrPremium = isOwner || isPremium;

  // ── Domain ────────────────────────────────────────────────────────────────
  let domain = analysis.url;
  try {
    const u = analysis.url.startsWith('http') ? analysis.url : `https://${analysis.url}`;
    domain = new URL(u).hostname.replace(/^www\./, '');
  } catch { /* use raw url */ }

  const v = verdict(analysis.overall_score);

  // ── Citation data ─────────────────────────────────────────────────────────
  const citationGaps = analysis.citation_gaps ?? [];
  const hasCitationData = citationGaps.length > 0;

  const bucketRows = BUCKET_ORDER.map((type) => {
    const gaps = citationGaps.filter((g) => g.query_type === type);
    if (gaps.length === 0) return null;
    const cited = gaps.filter((g) => g.status === 'cited').length;
    const total = gaps.length;
    const competitor = (() => {
      for (const g of gaps) {
        if (g.status === 'not_cited') {
          const c = getPrimaryCompetitor(g);
          if (c) return c;
        }
      }
      return null;
    })();
    return { type, label: BUCKET_LABELS[type] ?? type, cited, total, competitor };
  }).filter(Boolean) as { type: string; label: string; cited: number; total: number; competitor: string | null }[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Shared report banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 py-3">
        <div className="container px-4 mx-auto">
          <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <span>📊</span>
            <span>Shared AI Citation Audit — generated by <strong>llmcheck.app</strong></span>
          </p>
        </div>
      </div>

      <main className="container px-4 py-10 mx-auto max-w-4xl space-y-8">

        {/* "Run your own analysis" CTA — guests only, top of page */}
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
            AI Citation Audit
          </p>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            {domain}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 break-all">{analysis.url}</p>
        </div>

        {/* Overall Score — always visible */}
        <div className="p-8 bg-gradient-to-br from-gray-950 to-gray-900 rounded-2xl border border-gray-800 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Overall AI Visibility Score
          </p>
          <div className={`text-7xl font-black leading-none mb-2 ${scoreColor(analysis.overall_score)}`}>
            {analysis.overall_score}
            <span className="text-3xl text-gray-600 font-bold">/100</span>
          </div>
          <p className={`text-lg font-bold mt-3 ${v.color}`}>{v.label}</p>
          <div className="mt-5 w-full max-w-sm mx-auto bg-gray-800 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${scoreBarColor(analysis.overall_score)}`}
              style={{ width: `${analysis.overall_score}%` }}
            />
          </div>
        </div>

        {/* Parameters — all visible to everyone */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Analysis Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.parameters.map((param, i) => (
              <div key={i} className="p-4 bg-card rounded-xl border border-border">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-sm">{param.name}</h3>
                  <span className={`text-xl font-bold ${scoreColor(param.score)}`}>
                    {param.score}
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
            ))}
          </div>
        </div>

        {/* Mention cards — all 20 citation gaps, visible to everyone */}
        {hasCitationData && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              How {domain} appears in AI search
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Whether Perplexity cites this site across 20 customer search queries
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {citationGaps.map((gap, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-4 py-3"
                >
                  <div className="shrink-0 mt-0.5">
                    {gap.status === 'cited' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{gap.query}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 capitalize">{gap.query_type}</span>
                      {gap.status === 'not_cited' && getPrimaryCompetitor(gap) && (
                        <span className="text-xs text-gray-400">· {getPrimaryCompetitor(gap)}</span>
                      )}
                    </div>
                  </div>
                  {gap.status === 'cited' && gap.citation_position && (
                    <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      #{gap.citation_position}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bucket summary table — visible to everyone */}
        {bucketRows.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Visibility by query type
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              How often Perplexity cites this site across different search intents
            </p>
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Query Type
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Perplexity
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                      Displacing
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                  {bucketRows.map((row) => {
                    const pct = row.total > 0 ? Math.round((row.cited / row.total) * 100) : 0;
                    const scoreColor2 =
                      row.cited >= 4
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : row.cited >= 2
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-500 dark:text-red-400';
                    const barColor =
                      row.cited >= 4 ? 'bg-emerald-400' : row.cited >= 2 ? 'bg-amber-400' : 'bg-red-400';
                    return (
                      <tr key={row.type} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                          {row.label}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm font-semibold ${scoreColor2}`}>
                              {row.cited}
                              <span className="text-xs font-normal text-gray-400">/{row.total}</span>
                            </span>
                            <div className="h-1.5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400 hidden sm:table-cell">
                          {row.competitor ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {isOwnerOrPremium || isFreeUser ? (
          /* Free users and owner/premium see real recommendations */
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
          /* isGuest — blurred with sign-up CTA */
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

        {/* AI Visibility score cards */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            AI Visibility Analysis
          </h2>
          {isOwnerOrPremium ? (
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Full AI visibility scores (ChatGPT, Gemini, Perplexity) are available in your live report.
              </p>
              <Link href="/results" className="mt-3 inline-block">
                <Button variant="outline" size="sm">View Full Report →</Button>
              </Link>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <div className="blur-sm pointer-events-none select-none p-5 space-y-3" aria-hidden="true">
                {[
                  { llm: 'ChatGPT',    found: 3, total: 5 },
                  { llm: 'Gemini',     found: 2, total: 5 },
                  { llm: 'Perplexity', found: 4, total: 5 },
                ].map(({ llm, found, total }) => (
                  <div key={llm} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <span className="font-medium text-sm">{llm}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                      {found}/{total} queries
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                <Lock className="w-6 h-6 text-indigo-500" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {isGuest
                    ? 'Sign up free to see full visibility scores'
                    : 'Upgrade to Pro to see full visibility scores'}
                </p>
                <Link href={isGuest ? '/login' : '/pricing'}>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isGuest ? 'Sign up free' : 'Upgrade to Pro'}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Trend graph — blurred for guest + free, omitted for owner/premium (no data on share page) */}
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

        {/* Bottom CTA — tier-appropriate */}
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
              Unlock full AI visibility
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Upgrade to Pro to see ChatGPT, Gemini, and Perplexity scores — and track your visibility over time.
            </p>
            <Link href="/pricing">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8">
                Upgrade to Pro →
              </Button>
            </Link>
          </div>
        ) : (
          /* Owner or premium — subtle note at bottom */
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              This is a shared snapshot. For AI visibility scores and live trend data, view the full report in your dashboard.
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
