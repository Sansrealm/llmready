// RESULTS - Updated with PDF download functionality
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, Mail, RefreshCw, Loader2, CheckCircle } from "lucide-react";
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

// Updated premium check that uses server-side API (same as pricing page)
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

    // Use the same server-side subscription check as pricing page
    const { isPremium, isLoading: premiumLoading, debug, refresh } = useIsPremium();

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

        if (!analysisResult || !url) {
            setPdfError('Missing analysis data for PDF generation');
            return;
        }

        try {
            setPdfGenerating(true);
            setPdfError(null);
            setPdfSuccess(null);

            console.log('🔄 Generating PDF report...');

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    analysisResult,
                    url,
                    email: email || user?.emailAddresses?.[0]?.emailAddress,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate PDF');
            }

            if (data.success && data.downloadUrl) {
                console.log('✅ PDF generated successfully:', data.downloadUrl);

                // Trigger download
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = data.filename || 'llm-readiness-report.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setPdfSuccess('PDF report downloaded successfully!');

                // Clear success message after 5 seconds
                setTimeout(() => setPdfSuccess(null), 5000);
            } else {
                throw new Error('Invalid response from PDF generation service');
            }

        } catch (err: any) {
            console.error('❌ PDF generation failed:', err);
            setPdfError(err.message || 'Failed to generate PDF report');
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
                                    {isPremium ? 'Premium ✅' : 'Free'}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* PDF Success/Error Messages */}
                    {pdfSuccess && (
                        <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Success!</AlertTitle>
                            <AlertDescription>{pdfSuccess}</AlertDescription>
                        </Alert>
                    )}

                    {pdfError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>PDF Generation Error</AlertTitle>
                            <AlertDescription>{pdfError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Debug info for testing */}
                    {isSignedIn && process.env.NODE_ENV === 'development' && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left text-xs">
                            <h3 className="font-bold mb-2">🔍 Server-Side Subscription Check:</h3>
                            <div className="space-y-2">
                                <div><strong>User ID:</strong> {user?.id}</div>
                                <div><strong>Email:</strong> {user?.emailAddresses?.[0]?.emailAddress}</div>
                                <div><strong>Premium Status:</strong> <span className={isPremium ? 'text-green-600' : 'text-red-600'}>{isPremium ? '✅ Premium' : '❌ Free'}</span></div>
                                <div className="mt-2">
                                    <strong>Server-Side Debug:</strong>
                                    <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                                        {JSON.stringify(debug, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CLIENT-SIDE CLERK DEBUG - TypeScript Safe */}
                    {isSignedIn && process.env.NODE_ENV === 'development' && (
                        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-left text-xs">
                            <h3 className="font-bold mb-2">🔍 CLIENT-SIDE CLERK DEBUG:</h3>
                            <div className="space-y-2">
                                <div><strong>Client User ID:</strong> {user?.id}</div>
                                <div><strong>Client Email:</strong> {user?.emailAddresses?.[0]?.emailAddress}</div>

                                {/* Check public metadata */}
                                <div><strong>Public Metadata:</strong> {JSON.stringify(user?.publicMetadata || {})}</div>

                                {/* Show all user properties that might be subscription-related */}
                                <div className="mt-2">
                                    <strong>Available User Properties:</strong>
                                    <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                                        {JSON.stringify(Object.keys(user || {}), null, 2)}
                                    </pre>
                                </div>

                                {/* Try to access any subscription-like properties safely */}
                                <div className="mt-2">
                                    <strong>Subscription-Related Data:</strong>
                                    <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                                        {JSON.stringify({
                                            publicMetadata: user?.publicMetadata || {},
                                            privateMetadata: user?.privateMetadata || {},
                                            // Check if any subscription properties exist (safely)
                                            hasAnySubscriptionProps: Object.keys(user || {}).some(key =>
                                                key.toLowerCase().includes('sub') ||
                                                key.toLowerCase().includes('bill') ||
                                                key.toLowerCase().includes('plan')
                                            )
                                        }, null, 2)}
                                    </pre>
                                </div>
                            </div>
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

                    {error ? (
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
                                        disabled={!isSignedIn || !isPremium || pdfGenerating}
                                        className={!isSignedIn || !isPremium ? "opacity-70" : ""}
                                    >
                                        {pdfGenerating ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="mr-2 h-4 w-4" />
                                        )}
                                        {pdfGenerating ? 'Generating PDF...' : 'Download PDF Report'}
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