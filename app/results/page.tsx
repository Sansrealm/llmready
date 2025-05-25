// REFRESH-SESSION
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, Mail, RefreshCw } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    const [isPremiumState, setIsPremiumState] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Initial check from Clerk
    const isPremiumFromClerk = user?.publicMetadata?.premiumUser === true;

    // Effect to set initial state
    useEffect(() => {
        if (isPremiumFromClerk) {
            setIsPremiumState(true);
        }
    }, [isPremiumFromClerk]);

    // Enhanced refresh function for production use
    const refreshSession = async (maxRetries = 3) => {
        if (!user) return false;

        setRefreshing(true);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Refresh attempt ${attempt}/${maxRetries}`);

                // Force Clerk to refetch user data
                await user.reload();

                const isPremium = user.publicMetadata?.premiumUser === true;
                console.log(`Attempt ${attempt} - Premium status:`, isPremium);

                if (isPremium) {
                    // Success! Premium status found
                    setIsPremiumState(true);
                    setRefreshing(false);
                    return true;
                }

                // If not premium and not the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    console.log(`Waiting 5 seconds before retry ${attempt + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

            } catch (error) {
                console.error(`Refresh attempt ${attempt} failed:`, error);

                if (attempt === maxRetries) {
                    setRefreshing(false);
                    return false;
                }

                // Wait before retrying on error
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // All attempts failed
        setIsPremiumState(false);
        setRefreshing(false);
        return false;
    };

    // Use the local state for premium checks
    const isPremium = isPremiumState;

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

    // Premium feature handlers
    const generatePdfReport = async () => {
        if (!isSignedIn) {
            router.push('/login');
            return;
        }

        if (!isPremium) {
            router.push('/pricing');
            return;
        }

        // PDF generation logic will be implemented in the next phase
        alert("PDF generation will be implemented in the next phase");
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

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
                <div className="container py-8 px-4 md:px-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold">LLM Readiness Results</h1>
                        {isSignedIn && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refreshSession()}
                                disabled={refreshing}
                                className="ml-2"
                            >
                                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                                {refreshing ? 'Refreshing...' : 'Refresh Status'}
                            </Button>
                        )}
                    </div>
                    <p className="mb-6 text-gray-600">Analysis for: {url}</p>

                    {/* Premium status indicator */}
                    {isSignedIn && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <p className="text-sm">
                                Account Status: <span className={`font-medium ${isPremium ? 'text-green-600' : 'text-blue-600'}`}>
                                    {isPremium ? 'Premium' : 'Free'}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Remaining analyses notice for free users */}
                    {isSignedIn && !isPremium && analysisResult?.remainingAnalyses !== undefined && (
                        <div className="mb-6 p-4 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg">
                            <p>
                                You have <strong>{analysisResult.remainingAnalyses}</strong> analyses remaining in your free plan.{' '}
                                <Link href="/pricing" className="underline font-medium">
                                    Upgrade to Premium
                                </Link>{' '}
                                for unlimited analyses.
                            </p>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ) : error ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Analysis Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : analysisResult ? (
                        <div className="space-y-8">
                            {/* Overall Score */}
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
                                        disabled={!isSignedIn || !isPremium}
                                        className={!isSignedIn || !isPremium ? "opacity-70" : ""}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download PDF Report
                                        {(!isSignedIn || !isPremium) && <span className="ml-2 text-xs">(Premium)</span>}
                                    </Button>

                                    {email && (
                                        <Button
                                            variant="outline"
                                            onClick={sendEmailReport}
                                            disabled={!isSignedIn || !isPremium}
                                            className={!isSignedIn || !isPremium ? "opacity-70" : ""}
                                        >
                                            <Mail className="mr-2 h-4 w-4" />
                                            Send Report to Email
                                            {(!isSignedIn || !isPremium) && <span className="ml-2 text-xs">(Premium)</span>}
                                        </Button>
                                    )}

                                    {!isSignedIn ? (
                                        <Button asChild className="bg-gradient-to-r from-blue-600 to-green-500">
                                            <Link href="/login">Sign in for Premium Features</Link>
                                        </Button>
                                    ) : !isPremium && (
                                        <Button asChild className="bg-gradient-to-r from-blue-600 to-green-500">
                                            <Link href="/pricing">Upgrade to Premium</Link>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Parameters */}
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Analysis Parameters</h2>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {analysisResult.parameters.map((param, index) => (
                                        <div key={index} className="bg-white dark:bg-gray-950 rounded-lg border p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-lg font-medium">{param.name}</h3>
                                                <span className="text-lg font-bold">{param.score}/100</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{ width: `${param.score}%` }}
                                                ></div>
                                            </div>
                                            <p className={`text-sm ${param.isPremium && (!isSignedIn || !isPremium) ? "blur-sm" : ""}`}>
                                                {param.description}
                                            </p>
                                            {param.isPremium && (!isSignedIn || !isPremium) && (
                                                <div className="mt-2 text-center">
                                                    <p className="text-sm text-gray-500">
                                                        {!isSignedIn ? (
                                                            <Link href="/login" className="text-blue-500 hover:underline">
                                                                Sign in
                                                            </Link>
                                                        ) : (
                                                            <Link href="/pricing" className="text-blue-500 hover:underline">
                                                                Upgrade to premium
                                                            </Link>
                                                        )}{" "}
                                                        for full insights
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
                                <div className="space-y-4">
                                    {analysisResult.recommendations.map((rec, index) => (
                                        <div key={index} className="bg-white dark:bg-gray-950 rounded-lg border p-4">
                                            <h3 className="text-lg font-medium mb-2">{rec.title}</h3>
                                            <div className="flex gap-2 mb-2">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                    Difficulty: {rec.difficulty}
                                                </span>
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                    Impact: {rec.impact}
                                                </span>
                                            </div>
                                            <p className={`text-sm ${rec.isPremium && (!isSignedIn || !isPremium) ? "blur-sm" : ""}`}>
                                                {rec.description}
                                            </p>
                                            {rec.isPremium && (!isSignedIn || !isPremium) && (
                                                <div className="mt-2 text-center">
                                                    <p className="text-sm text-gray-500">
                                                        {!isSignedIn ? (
                                                            <Link href="/login" className="text-blue-500 hover:underline">
                                                                Sign in
                                                            </Link>
                                                        ) : (
                                                            <Link href="/pricing" className="text-blue-500 hover:underline">
                                                                Upgrade to premium
                                                            </Link>
                                                        )}{" "}
                                                        for detailed recommendations
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Call to action */}
                            <div className="mt-8 text-center">
                                <Button asChild className="mr-4">
                                    <Link href="/">Analyze Another Website</Link>
                                </Button>

                                {!isSignedIn ? (
                                    <Button asChild variant="outline">
                                        <Link href="/login">Sign in for Premium Features</Link>
                                    </Button>
                                ) : !isPremium && (
                                    <Button asChild variant="outline">
                                        <Link href="/pricing">View Premium Features</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>
            <Footer />
        </div>
    );
}