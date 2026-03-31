"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Lock, ExternalLink, BarChart2, ArrowRight } from "lucide-react";
import type { AnalyzedUrlSummary } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function scoreBadgeClass(score: number): string {
  if (score >= 70) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 40) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

// ── Upgrade gate ──────────────────────────────────────────────────────────────

function UpgradeGate() {
  const FAKE: { domain: string; score: number; date: string; scans: number }[] = [
    { domain: "yoursite.com",      score: 72, date: "Today",     scans: 4 },
    { domain: "example.io",        score: 45, date: "3d ago",    scans: 2 },
    { domain: "mybusiness.co",     score: 88, date: "1wk ago",   scans: 7 },
    { domain: "startup.app",       score: 31, date: "2wks ago",  scans: 1 },
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border">
      {/* Blurred placeholder rows */}
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Site</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Score</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center hidden sm:table-cell">Last analyzed</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center hidden sm:table-cell">Scans</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
            {FAKE.map((row) => (
              <tr key={row.domain}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">{row.domain}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(row.score)}`}>
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-400 hidden sm:table-cell">{row.date}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-400 hidden sm:table-cell">{row.scans}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs text-indigo-400">View →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 bg-white/70 dark:bg-gray-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
        <Lock className="w-6 h-6 text-indigo-400" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center px-6">
          Analysis history is a Premium feature
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs px-6">
          Track all your analyzed sites, score trends over time, and monitor improvements.
        </p>
        <Link href="/pricing">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white mt-1">
            Upgrade to Premium
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalysesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [isPremium, setIsPremium] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [analyses, setAnalyses] = useState<AnalyzedUrlSummary[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Redirect to login if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  // Check premium + fetch analyses
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function load() {
      try {
        const [subRes, analysesRes] = await Promise.all([
          fetch("/api/subscription-status"),
          fetch("/api/my-analyses?limit=100"),
        ]);

        const subData = await subRes.json();
        setIsPremium(subData.isPremium ?? false);

        if (analysesRes.ok) {
          const data = await analysesRes.json();
          setAnalyses(data.analyses ?? []);
        } else if (analysesRes.status === 403) {
          setAnalyses(null); // non-premium
        }
      } catch {
        setFetchError("Failed to load analyses. Please refresh the page.");
      } finally {
        setPremiumLoading(false);
      }
    }

    load();
  }, [isLoaded, isSignedIn]);

  // Skeleton while loading
  if (!isLoaded || premiumLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 container max-w-4xl px-4 py-10 md:px-6">
          <div className="h-8 w-40 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse mb-2" />
          <div className="h-4 w-64 rounded bg-gray-100 dark:bg-gray-800 animate-pulse mb-8" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 container max-w-4xl px-4 py-10 md:px-6">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Analyses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Every site you&apos;ve analyzed — track scores over time.
          </p>
        </div>

        {fetchError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {fetchError}
          </div>
        )}

        {/* Non-premium: blur gate */}
        {!isPremium ? (
          <UpgradeGate />
        ) : analyses === null || analyses.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart2 className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No analyses yet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              Analyze your first site and your history will appear here.
            </p>
            <Link href="/">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Analyze a site <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        ) : (
          /* Analyses table */
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Site</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Score</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center hidden sm:table-cell">Last analyzed</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center hidden sm:table-cell">Scans</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                {analyses.map((item) => {
                  const domain = getDomain(item.url);
                  return (
                    <tr
                      key={item.normalizedUrl}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {/* Favicon */}
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                            alt=""
                            className="w-5 h-5 rounded shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px] sm:max-w-xs">
                              {domain}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate max-w-[200px] sm:max-w-xs">
                              {item.url}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(item.latestScore)}`}>
                          {item.latestScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {relativeDate(item.analyzedAt)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {item.analysisCount} {item.analysisCount === 1 ? "scan" : "scans"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/results?url=${encodeURIComponent(item.url)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
