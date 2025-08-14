// app/results/page.tsx - Complete file with content validation for ads
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, Mail, RefreshCw, Loader2, CheckCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AdComponent from '@/components/AdComponent';

type AnalysisResult = {
    overall_score: number;
    parameters: Array<{
        name: string;
        score: number;
        isPremium: boolean;
        description: string;
    }>;
    recommendations: Array<{
        title: string;
        description: string;
        difficulty: string;
        impact: string;
        isPremium: boolean;
    }>;
    remainingAnalyses?: number;
};

// Premium check that uses server-side API
function useIsPremium() {
    const { user, isLoaded } = useUser();
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [debug, setDebug] = useState<any>({});

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

    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

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

    // 🔹 NEW: Comprehensive ad display validation
    const shouldShowAds = useMemo(() => {
        return !isPremium && // Not premium user
            !loading && // Not in loading state
            !error && // No error occurred
            analysisResult && // Has analysis results
            hasEnoughContent; // Has substantial content
    }, [isPremium, loading, error, analysisResult, hasEnoughContent]);

    useEffect(() => {
        async function fetchAnalysis() {
            if (!url) return;

            try {
                setLoading(true);
                const response = await fetch("/api/analyze", {
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
                setAnalysisResult(data);
            } catch (err: any) {
                console.error("Analysis error:", err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalysis();
    }, [url, email, industry]);

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

            const response = await fetch('/api/generate-report', {
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

    const sendEmailReport = async () => {
        if (!isSignedIn) {
            router.push('/login');
            return;
        }

        if (!isPremium || !email) {
            router.push('/pricing');
            return;
        }

        // Email sending logic will be implemented in the next phase
        alert("Email report sending will be implemented in the next phase");
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

                    {/* Remaining analyses for free users */}
                    {isSignedIn && !isPremium && analysisResult?.remainingAnalyses !== undefined && (
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-blue-700 dark:text-blue-300 text-sm">
                                You have <strong>{analysisResult.remainingAnalyses}</strong> free analyses remaining this month.
                                <Link href="/pricing" className="ml-2 text-blue-600 hover:text-blue-800 font-medium">
                                    Upgrade to Premium
                                </Link> for unlimited analyses.
                            </p>
                        </div>
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

                                    <Button
                                        onClick={sendEmailReport}
                                        disabled={!isSignedIn || !isPremium || !email}
                                        className={!isSignedIn || !isPremium ? "opacity-70" : ""}
                                    >
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email Report
                                    </Button>

                                    {!isSignedIn && (
                                        <Link href="/login">
                                            <Button variant="outline">
                                                Sign In for Premium Features
                                            </Button>
                                        </Link>
                                    )}

                                    {isSignedIn && !isPremium && (
                                        <Link href="/pricing">
                                            <Button variant="outline">
                                                Upgrade to Premium
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>

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

                            {/* Next Steps Section - ADDITIONAL CONTENT */}
                            <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
                                <div className="space-y-4">
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Based on your analysis results, here are the recommended next steps to improve your website's LLM readiness and ensure better visibility in AI-powered search engines:
                                    </p>
                                    <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-400">
                                        <li className="leading-relaxed">
                                            <strong>Prioritize High-Impact Changes:</strong> Focus on recommendations marked as "High Impact" first, as these will provide the most significant improvements to your LLM readiness score.
                                        </li>
                                        <li className="leading-relaxed">
                                            <strong>Implement Easy Fixes:</strong> Start with "Easy" difficulty recommendations to see immediate improvements without major development work.
                                        </li>
                                        <li className="leading-relaxed">
                                            <strong>Enhance Content Structure:</strong> Improve your HTML semantic markup, add clear headings, and ensure your content follows a logical hierarchy that AI models can easily understand.
                                        </li>
                                        <li className="leading-relaxed">
                                            <strong>Optimize Metadata:</strong> Update your title tags, meta descriptions, and schema markup to provide clear signals about your content's purpose and relevance.
                                        </li>
                                        <li className="leading-relaxed">
                                            <strong>Re-analyze and Monitor:</strong> After implementing changes, run another analysis to measure improvements and track your progress over time.
                                        </li>
                                    </ol>

                                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                                                💡 Pro Tip: Content Quality
                                            </h4>
                                            <p className="text-blue-600 dark:text-blue-400 text-sm">
                                                Focus on creating comprehensive, well-structured content that directly answers user questions. AI models prioritize content that provides clear, factual information with proper citations and context.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                                                🎯 Quick Win: Technical SEO
                                            </h4>
                                            <p className="text-green-600 dark:text-green-400 text-sm">
                                                Ensure your website loads quickly, is mobile-friendly, and has clean, semantic HTML structure. These technical factors significantly impact how AI models crawl and understand your content.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Learn More Section - EVEN MORE CONTENT */}
                            <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                                <h2 className="text-2xl font-bold mb-4">Learn More About LLM Optimization</h2>
                                <div className="space-y-4">
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Understanding how Large Language Models interact with web content is crucial for future-proofing your digital presence. As AI-powered search becomes more prevalent, websites optimized for LLM understanding will have significant advantages in discoverability and user engagement.
                                    </p>

                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <h4 className="font-semibold mb-2">Content Structure</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Learn how to organize your content with proper headings, sections, and semantic markup that AI models can easily parse and understand.
                                            </p>
                                        </div>

                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <h4 className="font-semibold mb-2">Semantic SEO</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Discover advanced techniques for creating content that aligns with how AI models interpret meaning, context, and relationships between topics.
                                            </p>
                                        </div>

                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <h4 className="font-semibold mb-2">Technical Implementation</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Explore the technical aspects of LLM optimization, including schema markup, structured data, and performance considerations.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 text-center">
                                        <Link href="/guide" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
                                            Read Our Complete LLM Optimization Guide →
                                        </Link>
                                    </div>
                                </div>
                            </div>
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
        </div>
    );
}