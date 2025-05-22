"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

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
};

export default function ResultsPage() {
    const { isLoaded, isSignedIn } = useUser();

    const searchParams = useSearchParams();
    const url = searchParams.get("url");
    const email = searchParams.get("email");
    const industry = searchParams.get("industry");

    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            } catch (err) {
                console.error("Analysis error:", err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalysis();
    }, [url, email, industry]);

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
                <div className="container py-8 px-4 md:px-6">
                    <h1 className="text-3xl font-bold mb-4">LLM Readiness Results</h1>
                    <p className="mb-6 text-gray-600">Analysis for: {url}</p>

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
                                            <p className={`text-sm ${param.isPremium && !isSignedIn ? "blur-sm" : ""}`}>
                                                {param.description}
                                            </p>
                                            {param.isPremium && !isSignedIn && (
                                                <div className="mt-2 text-center">
                                                    <p className="text-sm text-gray-500">Sign up for premium insights</p>
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
                                            <p className={`text-sm ${rec.isPremium && !isSignedIn ? "blur-sm" : ""}`}>
                                                {rec.description}
                                            </p>
                                            {rec.isPremium && !isSignedIn && (
                                                <div className="mt-2 text-center">
                                                    <p className="text-sm text-gray-500">Sign up for premium recommendations</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>
            <Footer />
        </div>
    );
}