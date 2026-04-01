// app/results/page.tsx - Complete file with content validation for ads
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, RefreshCw, Loader2, CheckCircle, Lock } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AdComponent from '@/components/AdComponent';
import ScoreHistoryWidget from '@/components/score-history-widget';
import { ShareButton } from '@/components/share-button';
import { AnalysisResult, DebugInfo, getPrimaryCompetitor } from '@/lib/types';
import AiVisibilityCheck from '@/components/ai-visibility-check';
import type { ScanSummary } from '@/components/ai-visibility-check';
import ExitSurveyModal from '@/components/exit-survey-modal';

// Premium check that uses server-side API
function useIsPremium() {
    const { user, isLoaded } = useUser();
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [debug, setDebug] = useState<DebugInfo>({});

    useEffect(() => {
        async function checkSubscriptionStatus() {
            if (!isLoaded || !user) {
                setIsLoading(false);
                return;
            }

            try {
                console.log('🔍 Fetching subscription status from server...');

                const response = await fetch('/api/subscription-status');
                const data = await response.json();

                console.log('✅ Server response:', data);

                setIsPremium(data.isPremium || false);
                setDebug(data.debug || {});

            } catch (error) {
                console.error('❌ Failed to check subscription status:', error);
                setIsPremium(false);
            } finally {
                setIsLoading(false);
            }
        }

        checkSubscriptionStatus();
    }, [user, isLoaded]);

    return {
        isPremium,
        isLoading,
        debug,
        refresh: () => {
            if (user) {
                setIsLoading(true);
                // Re-run the effect by updating a dependency
                window.location.reload();
            }
        }
    };
}

// v2 parameter slug → display name mapping
const PARAM_LABELS: Record<string, string> = {
    answer_ready_content:    'Answer-Ready Content',
    brand_expertise_clarity: 'Brand & Expertise Clarity',
    structured_data_depth:   'Structured Data Depth',
    citable_content_quality: 'Citable Content Quality',
    eeat_authority_signals:  'E-E-A-T & Authority Signals',
    intent_coverage_breadth: 'Comparison & Intent Coverage',
};

export default function ResultsPage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const router = useRouter();

    const searchParams = useSearchParams();
    const url = searchParams.get("url");
    const email = searchParams.get("email");
    const industry = searchParams.get("industry");

    const [refreshing, setRefreshing] = useState(false);
    const [parametersExpanded, setParametersExpanded] = useState(true);
    // null = waiting for ai-visibility-check to report back
    // false = component responded: no prior scan
    // true  = component responded: scan exists
    const [visibilityScanHasRun, setVisibilityScanHasRun] = useState<boolean | null>(null);
    const [scanHasCitationGaps, setScanHasCitationGaps] = useState<boolean | null>(null);
    const [scanIsLoading, setScanIsLoading] = useState(false);
    const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);

    // When true, the next queryFn call will bypass the server-side cache
    const bypassCacheRef = useRef(false);

    // ── Re-analyze cooldown state (populated after analysisResult is available) ──
    const REANALYZE_COOLDOWN_MS = 72 * 60 * 60 * 1000;
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [showReanalyzeWarning, setShowReanalyzeWarning] = useState(false);

    // Use React Query for analysis data fetching with caching
    const {
        data: analysisResult,
        isLoading: loading,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey: ['analysis', url, user?.id],
        queryFn: async () => {
            if (!url) throw new Error('URL is required');

            const useCached = !bypassCacheRef.current;
            bypassCacheRef.current = false; // reset after consuming

            console.log(useCached ? '🔄 Fetching analysis (with cache check)...' : '🔄 Re-analyzing (bypassing cache)...');

            const response = await fetch(useCached ? "/api/analyze?cached=true" : "/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url,
                    email,
                    industry,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to analyze website");
            }

            const data = await response.json();
            console.log('✅ Analysis fetched', data.cached ? '(from cache)' : '(fresh)');
            return data as AnalysisResult;
        },
        enabled: !!url && isLoaded, // Wait for Clerk to load before firing — prevents double-request
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        retry: 1,
    });

    // Convert React Query error to string for compatibility with existing code
    const error = queryError ? (queryError as Error).message : null;

    // ── Re-analyze cooldown (72 h) ──────────────────────────────────────────
    useEffect(() => {
        if (!analysisResult?.analyzed_at) return;
        const lastAnalyzed = new Date(analysisResult.analyzed_at).getTime();
        const update = () => {
            setCooldownRemaining(Math.max(0, lastAnalyzed + REANALYZE_COOLDOWN_MS - Date.now()));
        };
        update();
        const timer = setInterval(update, 60_000);
        return () => clearInterval(timer);
    }, [analysisResult?.analyzed_at]);

    const inCooldown = cooldownRemaining > 0;

    function formatCooldown(ms: number): string {
        const totalHours = Math.floor(ms / (1000 * 60 * 60));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        if (days > 0) return `${days}d ${hours}h`;
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    const handleReanalyzeClick = () => {
        if (inCooldown || loading) return;
        if (isSignedIn && !isPremium) {
            setShowReanalyzeWarning(true);
        } else {
            bypassCacheRef.current = true;
            refetch();
        }
    };

    const handleConfirmReanalyze = () => {
        setShowReanalyzeWarning(false);
        bypassCacheRef.current = true;
        refetch();
    };

    // Cycling status messages during analysis
    const STATUS_MESSAGES = [
        "Fetching your website content…",
        "Parsing page structure and metadata…",
        "Checking structured data and schema…",
        "Running AI readiness analysis…",
        "Scoring your parameters…",
        "Generating your recommendations…",
        "Almost there…",
    ];
    const [statusIdx, setStatusIdx] = useState(0);
    useEffect(() => {
        if (!loading) { setStatusIdx(0); return; }
        const interval = setInterval(() => {
            setStatusIdx(i => Math.min(i + 1, STATUS_MESSAGES.length - 1));
        }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

    // PDF generation states
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);

    // Use the server-side subscription check
    const { isPremium, isLoading: premiumLoading, debug, refresh } = useIsPremium();

    // 🔹 NEW: Content validation for ads
    const hasEnoughContent = useMemo(() => {
        if (!analysisResult) return false;

        // Check for minimum content requirements
        const hasValidScore = typeof analysisResult.overall_score === 'number';
        const hasParameters = analysisResult.parameters && analysisResult.parameters.length >= 3;
        const hasRecommendations = analysisResult.recommendations && analysisResult.recommendations.length >= 2;

        // Check for substantial text content in parameters
        const hasSubstantialParameters = analysisResult.parameters?.some(param =>
            param.description && param.description.length > 50
        );

        // Check for substantial text content in recommendations  
        const hasSubstantialRecommendations = analysisResult.recommendations?.some(rec =>
            rec.description && rec.description.length > 100
        );

        // Minimum content threshold
        const meetsMinimumThreshold = hasValidScore && hasParameters && hasRecommendations &&
            hasSubstantialParameters && hasSubstantialRecommendations;

        console.log('📊 Content validation:', {
            hasValidScore,
            hasParameters,
            hasRecommendations,
            hasSubstantialParameters,
            hasSubstantialRecommendations,
            meetsMinimumThreshold
        });

        return meetsMinimumThreshold;
    }, [analysisResult]);

    // Randomly rotate AI model name in upgrade headline
    const aiModelName = useMemo(() => {
        const models = ['ChatGPT', 'Gemini', 'Perplexity'];
        return models[Math.floor(Math.random() * models.length)];
    }, []);

    // 🔹 NEW: Comprehensive ad display validation
    const shouldShowAds = useMemo(() => {
        return !isPremium && // Not premium user
            !loading && // Not in loading state
            !error && // No error occurred
            analysisResult && // Has analysis results
            hasEnoughContent; // Has substantial content
    }, [isPremium, loading, error, analysisResult, hasEnoughContent]);

    // Citation intelligence computed values
    const topQueriesForDisplay = useMemo(() => {
        if (!analysisResult?.citationGaps) return [];
        const types = ['problem', 'category', 'comparison'] as const;
        return types.flatMap(type => {
            const match = analysisResult.citationGaps!.find(g => g.query_type === type);
            return match ? [match] : [];
        });
    }, [analysisResult?.citationGaps]);

    const bucketSummary = useMemo(() => {
        if (!analysisResult?.citationGaps) return [];
        const types = ['brand', 'problem', 'category', 'comparison'] as const;
        const labels: Record<string, string> = {
            brand: 'Brand', problem: 'Problem', category: 'Category', comparison: 'Comparison',
        };
        const implications: Record<string, string> = {
            brand: 'LLMs recognise your brand',
            problem: 'LLMs surface you for problems you solve',
            category: 'LLMs include you in category searches',
            comparison: 'LLMs mention you in comparisons',
        };
        return types.map(type => {
            const gaps = analysisResult.citationGaps!.filter(g => g.query_type === type);
            const cited = gaps.filter(g => g.status === 'cited').length;
            const total = gaps.length;
            return { type, label: labels[type], cited, total, implication: implications[type] };
        }).filter(b => b.total > 0);
    }, [analysisResult?.citationGaps]);

    const displacingDomains = useMemo(() => {
        if (!analysisResult?.citationGaps) return [];
        const freq: Record<string, number> = {};
        for (const gap of analysisResult.citationGaps) {
            if (gap.status === 'not_cited') {
                // Prefer Claude-extracted competitors_mentioned, fall back to legacy displaced_by
                if (gap.competitors_mentioned?.length) {
                    for (const c of gap.competitors_mentioned) {
                        if (c.competitor) freq[c.competitor] = (freq[c.competitor] || 0) + 1;
                    }
                } else {
                    for (const domain of gap.displaced_by) {
                        freq[domain] = (freq[domain] || 0) + 1;
                    }
                }
            }
        }
        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [analysisResult?.citationGaps]);

    // Enhanced refresh function
    const refreshSession = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    // PDF generation function
    const generatePdfReport = async () => {
        if (!isSignedIn) {
            router.push('/login');
            return;
        }

        if (!isPremium) {
            router.push('/pricing');
            return;
        }

        try {
            setPdfGenerating(true);
            setPdfError(null);
            setPdfSuccess(null);

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    analysisResult,
                    url,
                    email,
                    industry
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate report');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `llm-analysis-report-${new Date().getTime()}.html`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            setPdfSuccess('Report downloaded successfully! You can save it as PDF by opening the HTML file and pressing Ctrl+P to save as PDF.');

            // Clear success message after 8 seconds
            setTimeout(() => setPdfSuccess(null), 8000);

        } catch (error: unknown) {
            // TypeScript-safe error handling
            const errorMessage = error instanceof Error
                ? error.message
                : 'An unknown error occurred';

            console.error('❌ Report generation failed:', error);
            setPdfError(`Failed to generate report: ${errorMessage}`);
        } finally {
            setPdfGenerating(false);
        }
    };


    // Show loading screen while analysis is running
    if (premiumLoading || loading) {
        const progressPct = Math.round(((statusIdx + 1) / STATUS_MESSAGES.length) * 100);
        return (
            <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">
                    <div className="container py-12 px-4 md:px-6 max-w-2xl">
                        {/* Header */}
                        <div className="mb-8">
                            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-2">
                                AI Citation Audit
                            </p>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                                {url}
                            </h1>
                        </div>

                        {/* Status message */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" />
                            <p key={statusIdx} className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-all">
                                {STATUS_MESSAGES[statusIdx]}
                            </p>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-10">
                            <div
                                className="h-1.5 rounded-full bg-indigo-500 transition-all duration-700"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>

                        {/* Skeleton placeholders */}
                        <div className="space-y-4">
                            <Skeleton className="h-9 w-56 rounded-lg" />
                            <Skeleton className="h-4 w-72 rounded" />
                            <Skeleton className="h-36 w-full rounded-xl" />
                            <Skeleton className="h-36 w-full rounded-xl" />
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
                <div className="container py-8 px-4 md:px-6">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-3xl font-bold">AI Visibility Report</h1>
                        {isSignedIn && (
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                    isPremium
                                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isPremium ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    {isPremium ? 'Premium' : 'Free'}
                                </span>
                                {!isPremium && (
                                    <Link href="/pricing" className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
                                        Upgrade →
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="mb-6 text-gray-500 dark:text-gray-400 text-sm">Analysis for: {url}</p>

                    {/* Success/Error messages for PDF generation */}
                    {pdfSuccess && (
                        <Alert className="mb-6 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Report Generated Successfully!</AlertTitle>
                            <AlertDescription className="text-green-700">
                                {pdfSuccess}
                            </AlertDescription>
                        </Alert>
                    )}

                    {pdfError && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Report Generation Failed</AlertTitle>
                            <AlertDescription>{pdfError}</AlertDescription>
                        </Alert>
                    )}

                    {error ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Analysis Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : analysisResult ? (
                        <div className="space-y-8">
                            {/* ── Hero: two-column ── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {/* LEFT — AI Visibility (PRIMARY outcome metric) */}
                                <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                    <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4"
                                       style={{ fontFamily: 'var(--font-mono)' }}>
                                        AI Visibility
                                    </p>

                                    {!isSignedIn ? (
                                        /* Not signed in — blur gate */
                                        <div className="relative rounded-xl overflow-hidden min-h-[180px]">
                                            <div className="blur-sm pointer-events-none select-none space-y-2.5" aria-hidden="true">
                                                <div className="text-5xl font-bold text-gray-200 dark:text-gray-800 mb-1"
                                                     style={{ fontFamily: 'var(--font-mono)' }}>— / —</div>
                                                <p className="text-xs text-gray-300 dark:text-gray-700 mb-3">queries cited your brand</p>
                                                <div className="space-y-2.5">
                                                    {['Brand', 'Problem', 'Category', 'Comparison'].map((label, i) => (
                                                        <div key={label} className="flex items-center gap-2">
                                                            <span className="text-xs w-20 text-gray-300 dark:text-gray-700 shrink-0"
                                                                  style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
                                                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full bg-indigo-200 dark:bg-indigo-900"
                                                                     style={{ width: `${[45, 30, 60, 25][i]}%` }} />
                                                            </div>
                                                            <span className="text-xs text-gray-300 dark:text-gray-700 w-6 text-right shrink-0"
                                                                  style={{ fontFamily: 'var(--font-mono)' }}>—</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 bg-white/70 dark:bg-gray-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 rounded-xl">
                                                <Lock className="w-5 h-5 text-indigo-400" />
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center px-4">
                                                    Sign in to see your AI visibility data
                                                </p>
                                                <SignInButton mode="modal">
                                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Sign in</Button>
                                                </SignInButton>
                                            </div>
                                        </div>
                                    ) : premiumLoading ? (
                                        /* Checking subscription — avoid flash of wrong state */
                                        <div className="space-y-3">
                                            {[72, 56, 80, 64].map((w, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="h-2.5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: `${w * 0.4}px` }} />
                                                    <div className="h-2.5 flex-1 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                                    <div className="h-2.5 w-7 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : !isPremium ? (
                                        /* Signed in, not premium — blur gate with upgrade CTA */
                                        <div className="relative rounded-xl overflow-hidden min-h-[180px]">
                                            <div className="blur-sm pointer-events-none select-none space-y-2.5" aria-hidden="true">
                                                <div className="text-5xl font-bold text-gray-200 dark:text-gray-800 mb-1"
                                                     style={{ fontFamily: 'var(--font-mono)' }}>— / —</div>
                                                <p className="text-xs text-gray-300 dark:text-gray-700 mb-3">queries cited your brand</p>
                                                <div className="space-y-2.5">
                                                    {['Brand', 'Problem', 'Category', 'Comparison'].map((label, i) => (
                                                        <div key={label} className="flex items-center gap-2">
                                                            <span className="text-xs w-20 text-gray-300 dark:text-gray-700 shrink-0"
                                                                  style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
                                                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full bg-indigo-200 dark:bg-indigo-900"
                                                                     style={{ width: `${[45, 30, 60, 25][i]}%` }} />
                                                            </div>
                                                            <span className="text-xs text-gray-300 dark:text-gray-700 w-6 text-right shrink-0"
                                                                  style={{ fontFamily: 'var(--font-mono)' }}>—</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 bg-white/70 dark:bg-gray-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 rounded-xl">
                                                <Lock className="w-5 h-5 text-indigo-400" />
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center px-4">
                                                    Upgrade to see AI visibility data
                                                </p>
                                                <Link href="/pricing">
                                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Upgrade to Premium</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ) : scanIsLoading || (!scanSummary) ? (
                                        /* Loading state */
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                                                <span className="animate-pulse">Analyzing visibility across major LLMs…</span>
                                            </div>
                                            <div className="space-y-3 pt-1">
                                                {[72, 56, 80, 64].map((w, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <div className="h-2.5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: `${w * 0.4}px` }} />
                                                        <div className="h-2.5 flex-1 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                                        <div className="h-2.5 w-7 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Scan data — ground truth outcome metric */
                                        <div>
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-5xl font-bold text-gray-900 dark:text-white"
                                                      style={{ fontFamily: 'var(--font-mono)' }}>
                                                    {scanSummary.totalFound}
                                                </span>
                                                <span className="text-xl font-medium text-gray-400"
                                                      style={{ fontFamily: 'var(--font-mono)' }}>
                                                    / {scanSummary.totalQueries}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">queries cited your brand</p>

                                            <div className="space-y-2.5">
                                                {scanSummary.buckets.map(b => (
                                                    <button
                                                        key={b.type}
                                                        className="w-full flex items-center gap-2 group"
                                                        onClick={() => document.getElementById(`visibility-bucket-${b.type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                                    >
                                                        <span className="text-xs w-20 text-left text-gray-500 dark:text-gray-400 shrink-0 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                                              style={{ fontFamily: 'var(--font-mono)' }}>{b.label}</span>
                                                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full bg-indigo-500 group-hover:bg-indigo-600 transition-all duration-500"
                                                                 style={{ width: `${b.total > 0 ? (b.found / b.total) * 100 : 0}%` }} />
                                                        </div>
                                                        <span className="text-xs text-gray-400 w-8 text-right shrink-0"
                                                              style={{ fontFamily: 'var(--font-mono)' }}>
                                                            {b.found}/{b.total}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>

                                            {scanSummary.topCompetitor && (
                                                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                                    When AI skips you, it recommends{' '}
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{scanSummary.topCompetitor}</span> instead.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT — AI Optimization Score (secondary diagnostic) */}
                                <div className="bg-white dark:bg-gray-950 rounded-lg border p-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4"
                                           style={{ fontFamily: 'var(--font-mono)' }}>
                                            AI Optimization Score
                                        </p>
                                        <div className="flex items-center gap-5 mb-5">
                                            {/* Score ring */}
                                            <div className="relative shrink-0 w-20 h-20">
                                                <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                                                    <circle cx="40" cy="40" r="34" fill="none"
                                                        className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="6" />
                                                    <circle cx="40" cy="40" r="34" fill="none"
                                                        stroke={analysisResult.overall_score >= 75 ? '#22c55e' : analysisResult.overall_score >= 50 ? '#3b82f6' : analysisResult.overall_score >= 30 ? '#f59e0b' : '#ef4444'}
                                                        strokeWidth="6"
                                                        strokeDasharray="213.6"
                                                        strokeDashoffset={213.6 * (1 - analysisResult.overall_score / 100)}
                                                        strokeLinecap="round" />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-2xl font-medium leading-none text-gray-900 dark:text-white"
                                                          style={{ fontFamily: 'var(--font-mono)' }}>
                                                        {analysisResult.overall_score}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5"
                                                          style={{ fontFamily: 'var(--font-mono)' }}>/100</span>
                                                </div>
                                            </div>
                                            {/* Narrative */}
                                            <div>
                                                <p className="text-base leading-snug text-gray-900 dark:text-white"
                                                   style={{ fontFamily: 'var(--font-serif)' }}>
                                                    {(() => {
                                                        const s = analysisResult.overall_score;
                                                        const params = [...(analysisResult.parameters ?? [])].sort((a, b) => a.score - b.score);
                                                        const worst = params.slice(0, 2).filter(p => p.score < 75);
                                                        const verdict = s >= 75 ? 'well-optimised for AI search'
                                                            : s >= 50 ? 'partially visible to AI search, with key gaps'
                                                            : s >= 30 ? 'below average for AI search visibility'
                                                            : 'largely invisible to AI search engines';
                                                        const gap = worst.length >= 2
                                                            ? `${worst[0].name} and ${worst[1].name} are the highest-priority fixes`
                                                            : worst.length === 1 ? `${worst[0].name} is the highest-priority fix` : '';
                                                        return `Your site is ${verdict}.${gap ? ` ${gap}.` : ''}`;
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <Button
                                            onClick={generatePdfReport}
                                            disabled={!isSignedIn || !isPremium || pdfGenerating}
                                            className={!isSignedIn || !isPremium ? "opacity-70" : ""}
                                            size="sm"
                                        >
                                            {pdfGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                                            {pdfGenerating ? 'Generating...' : 'Report'}
                                        </Button>

                                        {analysisResult?.id && (
                                            <ShareButton
                                                analysisId={analysisResult.id}
                                                isPremium={isPremium}
                                                userEmail={email}
                                                url={url || ''}
                                                overallScore={analysisResult.overall_score}
                                            />
                                        )}

                                        <Button
                                            onClick={handleReanalyzeClick}
                                            disabled={inCooldown || loading}
                                            variant="outline"
                                            size="sm"
                                            title={inCooldown ? `Available in ${formatCooldown(cooldownRemaining)}` : "Run a fresh analysis"}
                                        >
                                            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                            {loading ? 'Analyzing…' : inCooldown ? `Re-analyze in ${formatCooldown(cooldownRemaining)}` : 'Re-analyze'}
                                        </Button>

                                        {!isSignedIn && (
                                            <Link href="/login">
                                                <Button variant="outline" size="sm">Sign in</Button>
                                            </Link>
                                        )}
                                    </div>

                                    {/* Free user re-analyze warning */}
                                    {showReanalyzeWarning && (
                                        <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                                            <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                                                ⚠️ This will use <strong>1 of your {analysisResult?.remainingAnalyses ?? 0} remaining analyses</strong>. Continue?
                                            </p>
                                            <div className="flex gap-2">
                                                <button onClick={handleConfirmReanalyze}
                                                    className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md transition-colors">
                                                    Confirm &amp; Re-analyze
                                                </button>
                                                <button onClick={() => setShowReanalyzeWarning(false)}
                                                    className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline px-2">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* ── Priority Action Plan — immediately below hero ── */}
                            {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                                <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                    <h2 className="text-2xl font-bold mb-1">Priority Action Plan</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                        Your top 5 highest-impact actions to improve AI Visibility
                                    </p>
                                    <div className="space-y-4">
                                        {analysisResult.recommendations.map((rec, index) => (
                                            <div key={index} className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg">
                                                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">{rec.title}</h3>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : rec.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                            {rec.difficulty}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.impact === 'High' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : rec.impact === 'Medium' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                            {rec.impact} Impact
                                                        </span>
                                                    </div>
                                                </div>
                                                {rec.parameter && PARAM_LABELS[rec.parameter] && (
                                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 mb-2">
                                                        Improves: {PARAM_LABELS[rec.parameter]}
                                                    </span>
                                                )}
                                                {rec.isPremium && !isPremium ? (
                                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic mt-1">
                                                        🔒{' '}
                                                        <Link href="/pricing" className="text-indigo-500 hover:underline">
                                                            Upgrade to Premium
                                                        </Link>{' '}
                                                        to see the full implementation guide for this action.
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
                                                        {rec.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Upgrade block for free users */}
                            {!isPremium && (
                                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-6">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="text-green-600 font-bold text-sm mt-0.5">✓ Your LLM score: {analysisResult.overall_score}/100</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        But is {aiModelName} actually recommending you?
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Check your visibility across ChatGPT, Gemini &amp; Perplexity
                                    </p>
                                    <ul className="space-y-1.5 mb-5">
                                        {[
                                            "See which queries you appear in",
                                            "Track improvements over time",
                                            "Download a full PDF report",
                                        ].map((item) => (
                                            <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="text-indigo-500">→</span> {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex flex-wrap gap-3">
                                        <Link href="/pricing">
                                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                                                Check My AI Visibility — $9/mo
                                            </button>
                                        </Link>
                                        <Link href="/ai-visibility">
                                            <button className="border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                                                See Example Report →
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Score History Widget - PREMIUM ONLY */}
                            {url && (
                                <ScoreHistoryWidget
                                    url={url}
                                    isPremium={isPremium}
                                    isLoading={premiumLoading}
                                />
                            )}

                            {/* ── AI Optimization Score — collapsible parameters ── */}
                            <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-2xl font-bold">AI Optimization Score</h2>
                                    <button
                                        onClick={() => setParametersExpanded(e => !e)}
                                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
                                        aria-expanded={parametersExpanded}
                                    >
                                        {parametersExpanded ? 'Collapse ↑' : 'Expand ↓'}
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                    Website factors that influence your AI Visibility — improve these to increase your score
                                    <span className="block text-xs mt-1 text-gray-400 dark:text-gray-500">
                                        Score based on the analyzed URL. Submit a content-rich page (e.g. /faq or a blog post) for a deeper score.
                                    </span>
                                </p>
                                {parametersExpanded && (
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {analysisResult.parameters.map((param, index) => (
                                            <div key={index} className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className="font-semibold text-sm">{param.name}</h3>
                                                    <div className={`text-lg font-bold ${param.score >= 75 ? 'text-green-600 dark:text-green-400' : param.score >= 50 ? 'text-blue-600 dark:text-blue-400' : param.score >= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {param.score}/100
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                                                    <div
                                                        className={`h-2 rounded-full ${param.score >= 75 ? 'bg-green-500' : param.score >= 50 ? 'bg-blue-500' : param.score >= 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${param.score}%` }}
                                                    />
                                                </div>
                                                {param.isPremium && !isPremium ? (
                                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                                        🔒{' '}
                                                        <Link href="/pricing" className="text-indigo-500 hover:underline">
                                                            Upgrade to Premium
                                                        </Link>{' '}
                                                        for detailed insights on this factor.
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                        {param.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 🔹 CONDITIONAL AD PLACEMENT - After substantial content */}
                            {shouldShowAds && (
                                <div className="my-8">
                                    <AdComponent adSlot="7142437859" />
                                </div>
                            )}

                            {/* 🔹 DEBUG INFO - Development only */}
                            {process.env.NODE_ENV === 'development' && !shouldShowAds && (
                                <div className="my-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-700">
                                        🚫 <strong>Ads Hidden (Dev Mode)</strong> - Reasons:
                                        {isPremium && ' Premium user,'}
                                        {loading && ' Loading,'}
                                        {error && ' Error state,'}
                                        {!analysisResult && ' No results,'}
                                        {!hasEnoughContent && ' Insufficient content'}
                                    </p>
                                </div>
                            )}

                            {/* Section 1: Top Queries — authenticated users only */}
                            {isSignedIn && topQueriesForDisplay.length > 0 && (
                                <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                    <h2 className="text-xl font-bold mb-1">How you appear when customers search</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                        These are the queries most likely driving traffic to your competitors
                                    </p>
                                    <div className="space-y-3">
                                        {topQueriesForDisplay.map((gap, i) => (
                                            <div key={i} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{gap.query}</p>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 capitalize mt-0.5 inline-block">{gap.query_type}</span>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    {gap.status === 'cited' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                                            Cited
                                                        </span>
                                                    ) : (
                                                        <div className="text-right">
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                                                                Not cited
                                                            </span>
                                                            {getPrimaryCompetitor(gap) && (
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                    {getPrimaryCompetitor(gap)} appeared instead
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Visibility Check Section */}
                            {url && (
                                <div id="ai-visibility-section">
                                    <AiVisibilityCheck
                                        url={url}
                                        industry={industry ?? analysisResult?.industry ?? null}
                                        isSignedIn={!!isSignedIn}
                                        isPremium={isPremium}
                                        userEmail={user?.primaryEmailAddress?.emailAddress ?? null}
                                        userId={user?.id ?? null}
                                        visibilityQueries={analysisResult?.visibilityQueries}
                                        queryBuckets={analysisResult?.queryBuckets}
                                        citationGaps={analysisResult?.citationGaps}
                                        onScanLoading={() => setScanIsLoading(true)}
                                        onScanStatusKnown={(hasRun, hasCitationGaps, summary) => {
                                            setScanIsLoading(false);
                                            setVisibilityScanHasRun(hasRun);
                                            setScanHasCitationGaps(hasCitationGaps);
                                            if (summary) setScanSummary(summary);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Section 2: Visibility by Query Type — premium only */}
                            {bucketSummary.length > 0 && (
                                <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                    <h2 className="text-xl font-bold mb-1">Visibility by query type</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                        How often Perplexity cites you across different search intents
                                    </p>
                                    {isPremium ? (
                                        <div className="space-y-5">
                                            {bucketSummary.map(bucket => {
                                                const pct = bucket.total > 0 ? (bucket.cited / bucket.total) * 100 : 0;
                                                const barColor = bucket.cited >= 3 ? 'bg-green-500' : bucket.cited === 2 ? 'bg-amber-500' : 'bg-red-500';
                                                const textColor = bucket.cited >= 3 ? 'text-green-700 dark:text-green-400' : bucket.cited === 2 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400';
                                                return (
                                                    <div key={bucket.type}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="min-w-0">
                                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{bucket.label}</span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">— {bucket.implication}</span>
                                                            </div>
                                                            <span className={`text-sm font-bold shrink-0 ml-4 ${textColor}`}>{bucket.cited}/{bucket.total}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                            <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="space-y-5 blur-sm pointer-events-none select-none" aria-hidden>
                                                {bucketSummary.map(bucket => (
                                                    <div key={bucket.type}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{bucket.label}</span>
                                                            <span className="text-sm font-bold text-gray-400">?/5</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                            <div className="h-2 rounded-full bg-gray-300 dark:bg-gray-600" style={{ width: '55%' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center bg-white dark:bg-gray-950 px-6 py-4 rounded-xl border shadow-sm">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">🔒 Premium feature</p>
                                                    <Link href="/pricing" className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
                                                        Upgrade to see citation breakdown →
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section 3: Who is displacing you — premium only */}
                            {displacingDomains.length > 0 && (
                                <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                    <h2 className="text-xl font-bold mb-1">Who appears instead of you</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                        Sites Perplexity cites when your domain doesn&apos;t appear
                                    </p>
                                    {isPremium ? (
                                        <div className="space-y-3">
                                            {displacingDomains.map(([domain, count], i) => {
                                                const maxCount = displacingDomains[0][1];
                                                const pct = Math.round((count / maxCount) * 100);
                                                return (
                                                    <div key={domain} className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 w-4 shrink-0">{i + 1}</span>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white w-44 shrink-0 truncate">{domain}</span>
                                                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                            <div className="h-2 rounded-full bg-red-400 dark:bg-red-500 transition-all" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-16 text-right">
                                                            {count} {count === 1 ? 'query' : 'queries'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="space-y-3 blur-sm pointer-events-none select-none" aria-hidden>
                                                {displacingDomains.map(([, count], i) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}</span>
                                                        <span className="text-sm font-medium text-gray-400 w-44 shrink-0">competitor.com</span>
                                                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                            <div className="h-2 rounded-full bg-gray-300 dark:bg-gray-600" style={{ width: `${Math.round((1 / (i + 1)) * 80 + 20)}%` }} />
                                                        </div>
                                                        <span className="text-xs text-gray-400 shrink-0 w-16 text-right">{count} queries</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center bg-white dark:bg-gray-950 px-6 py-4 rounded-xl border shadow-sm">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">🔒 Premium feature</p>
                                                    <Link href="/pricing" className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
                                                        Upgrade to see who&apos;s outranking you →
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Guest "create account" hook — shown after full results */}
                            {!isSignedIn && (
                                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 p-6 text-center">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">
                                        You&apos;ve used your free scan
                                    </p>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        Want to check more sites?
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Create a free account and get <strong>3 analyses per month</strong> — no credit card required.
                                    </p>
                                    <Link href="/login">
                                        <button className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
                                            Create Free Account →
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                            {/* No ads during loading */}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
            <ExitSurveyModal isPremium={isPremium} isSignedIn={!!isSignedIn} page="results" />
        </div>
    );
}