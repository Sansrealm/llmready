// app/results/page.tsx - Complete file with content validation for ads
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, RefreshCw, Loader2, CheckCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AdComponent from '@/components/AdComponent';
import ScoreHistoryWidget from '@/components/score-history-widget';
import { ShareButton } from '@/components/share-button';
import { AnalysisResult, DebugInfo } from '@/lib/types';
import AiVisibilityCheck from '@/components/ai-visibility-check';
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

export default function ResultsPage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const router = useRouter();

    const searchParams = useSearchParams();
    const url = searchParams.get("url");
    const email = searchParams.get("email");
    const industry = searchParams.get("industry");

    const [refreshing, setRefreshing] = useState(false);

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


    // Show loading screen while checking premium status
    if (premiumLoading || loading) {
        return (
            <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">
                    <div className="container py-8 px-4 md:px-6">
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
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
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold">LLM Readiness Results</h1>
                    </div>
                    <p className="mb-6 text-gray-600">Analysis for: {url}</p>

                    {/* Premium status indicator */}
                    {isSignedIn && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <p className="text-sm">
                                Account Status: <span className={`font-medium ${isPremium ? 'text-green-600' : 'text-blue-600'}`}>
                                    {isPremium ? 'Premium' : 'Free'}
                                </span>
                                {!isPremium && (
                                    <span className="ml-2">
                                        - <Link href="/pricing" className="text-blue-600 hover:underline">Upgrade for full features</Link>
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

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
                            {/* Overall Score Section */}
                            <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                <h2 className="text-2xl font-bold mb-4">Overall LLM Readiness Score</h2>
                                <div className="flex items-center space-x-4">
                                    <div className="text-4xl font-bold text-blue-600">
                                        {analysisResult.overall_score}
                                    </div>
                                    <div className="text-lg text-gray-500">out of 100</div>
                                </div>
                                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${analysisResult.overall_score}%` }}
                                    ></div>
                                </div>

                                {/* Premium features buttons */}
                                <div className="mt-6 flex flex-wrap gap-4">
                                    <Button
                                        onClick={generatePdfReport}
                                        disabled={!isSignedIn || !isPremium || pdfGenerating}
                                        className={!isSignedIn || !isPremium ? "opacity-70" : ""}
                                    >
                                        {pdfGenerating ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="mr-2 h-4 w-4" />
                                        )}
                                        {pdfGenerating ? 'Generating...' : 'Download Report'}
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
                                        title={inCooldown ? `Available in ${formatCooldown(cooldownRemaining)}` : "Run a fresh analysis"}
                                    >
                                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        {loading
                                            ? 'Analyzing...'
                                            : inCooldown
                                            ? `Re-analyze in ${formatCooldown(cooldownRemaining)}`
                                            : 'Re-analyze'}
                                    </Button>

                                    {/* Free user re-analyze warning */}
                                    {showReanalyzeWarning && (
                                        <div className="w-full mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                                            <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                                                ⚠️ This will use <strong>1 of your {analysisResult?.remainingAnalyses ?? 0} remaining analyses</strong>. Continue?
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleConfirmReanalyze}
                                                    className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md transition-colors"
                                                >
                                                    Confirm &amp; Re-analyze
                                                </button>
                                                <button
                                                    onClick={() => setShowReanalyzeWarning(false)}
                                                    className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline px-2"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!isSignedIn && (
                                        <Link href="/login">
                                            <Button variant="outline">
                                                Sign In for Premium Features
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>

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

                            {/* Parameters Section - SUBSTANTIAL CONTENT */}
                            <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                <h2 className="text-2xl font-bold mb-6">Detailed Analysis Parameters</h2>
                                <div className="grid gap-6 md:grid-cols-2">
                                    {analysisResult.parameters.map((param, index) => (
                                        <div key={index} className="p-4 border rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-semibold">{param.name}</h3>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {param.score}/100
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${param.score}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {param.description}
                                            </p>
                                            {param.isPremium && !isPremium && (
                                                <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                                                    🔒 Premium feature - upgrade for detailed insights
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
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

                            {/* Recommendations Section - MORE SUBSTANTIAL CONTENT */}
                            <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                <h2 className="text-2xl font-bold mb-6">Recommendations for Improvement</h2>
                                <div className="space-y-6">
                                    {analysisResult.recommendations.map((rec, index) => (
                                        <div key={index} className="p-4 border rounded-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-lg">{rec.title}</h3>
                                                <div className="flex gap-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${rec.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                                            rec.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {rec.difficulty}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${rec.impact === 'High' ? 'bg-blue-100 text-blue-800' :
                                                            rec.impact === 'Medium' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {rec.impact} Impact
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {rec.description}
                                            </p>
                                            {rec.isPremium && !isPremium && (
                                                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                                                    <p className="text-sm text-orange-700 dark:text-orange-300">
                                                        🔒 <strong>Premium Insight:</strong> Upgrade to access detailed implementation guides and advanced recommendations.
                                                    </p>
                                                    <Link href="/pricing" className="text-orange-600 hover:text-orange-800 text-sm font-medium">
                                                        View Premium Plans →
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AI Visibility Check Section */}
                            {url && (
                                <AiVisibilityCheck
                                    url={url}
                                    industry={industry ?? analysisResult?.industry ?? null}
                                    isSignedIn={!!isSignedIn}
                                    isPremium={isPremium}
                                    userEmail={user?.primaryEmailAddress?.emailAddress ?? null}
                                    userId={user?.id ?? null}
                                    visibilityQueries={analysisResult?.visibilityQueries}
                                />
                            )}

                            {/* Priority Action Plan — driven by lowest-scoring parameters */}
                            {(() => {
                                const priorityParams = [...analysisResult.parameters]
                                    .sort((a, b) => a.score - b.score)
                                    .slice(0, 3);

                                return (
                                    <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                        <h2 className="text-2xl font-bold mb-1">Priority Action Plan</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                            Your 3 lowest-scoring areas — fix these first for the biggest score gains.
                                        </p>
                                        <div className="space-y-4">
                                            {priorityParams.map((param, index) => {
                                                const isLow = param.score < 40;
                                                const isMid = param.score >= 40 && param.score < 70;
                                                const badgeClass = isLow
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : isMid
                                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                                                const label = isLow ? "Critical" : isMid ? "Needs Work" : "Polish";

                                                return (
                                                    <div key={index} className="flex gap-4 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                                                        {/* Score circle */}
                                                        <div className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold ${badgeClass}`}>
                                                            <span className="text-lg leading-none">{param.score}</span>
                                                            <span className="text-[10px] opacity-70 leading-none mt-0.5">/100</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                <h3 className="font-semibold text-gray-900 dark:text-white">{param.name}</h3>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                                                                    {label}
                                                                </span>
                                                            </div>
                                                            {param.isPremium && !isPremium ? (
                                                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                                                    🔒{" "}
                                                                    <Link href="/pricing" className="text-indigo-500 hover:underline">
                                                                        Upgrade to Premium
                                                                    </Link>{" "}
                                                                    to see specific improvement steps for this area.
                                                                </p>
                                                            ) : (
                                                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                                    {param.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                                            <Link href="/guide" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                                                Read our full LLM optimisation guide →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })()}
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