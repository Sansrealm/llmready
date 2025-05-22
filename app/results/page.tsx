"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
// Import other components as needed

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
    const { isLoaded, userId } = useAuth();
    const isAuthenticated = isLoaded && !!userId;

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

    // Rest of your component code for displaying results
    // ...

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-4">LLM Readiness Results</h1>
            <p className="mb-6">Analysis for: {url}</p>

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            ) : error ? (
                <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
                    {error}
                </div>
            ) : analysisResult ? (
                <div>
                    {/* Display your analysis results here */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">Overall Score: {analysisResult.overall_score}</h2>
                        {/* Add score visualization */}
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">Parameters</h2>
                        {analysisResult.parameters.map((param, index) => (
                            <div key={index} className="mb-4 p-4 border rounded-lg">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">{param.name}</h3>
                                    <span className="text-lg font-bold">{param.score}/100</span>
                                </div>
                                <p className={param.isPremium && !isAuthenticated ? "blur-sm" : ""}>
                                    {param.description}
                                </p>
                                {param.isPremium && !isAuthenticated && (
                                    <div className="mt-2 text-center">
                                        <p className="text-sm text-gray-500">Sign up for premium insights</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
                        {analysisResult.recommendations.map((rec, index) => (
                            <div key={index} className="mb-4 p-4 border rounded-lg">
                                <h3 className="text-lg font-medium">{rec.title}</h3>
                                <div className="flex gap-2 my-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                        Difficulty: {rec.difficulty}
                                    </span>
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                        Impact: {rec.impact}
                                    </span>
                                </div>
                                <p className={rec.isPremium && !isAuthenticated ? "blur-sm" : ""}>
                                    {rec.description}
                                </p>
                                {rec.isPremium && !isAuthenticated && (
                                    <div className="mt-2 text-center">
                                        <p className="text-sm text-gray-500">Sign up for premium recommendations</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
