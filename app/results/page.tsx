// src/app/results/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResultsPage() {
    const searchParams = useSearchParams();
    const url = searchParams.get("url") || "example.com";
    const email = searchParams.get("email") || "";
    const industry = searchParams.get("industry") || "";

    const isPremium = email !== "";
    const score = 72; // Example score

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-6">LLM Readiness Results</h1>
            <p className="text-xl mb-8">Analysis for: {url}</p>

            {/* Score Display */}
            <div className="bg-card rounded-lg p-6 shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Overall Score</h2>
                <div className="flex justify-center items-center">
                    <div className="relative w-40 h-40">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke={score >= 70 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444"}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 45}`}
                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - score / 100)}`}
                                transform="rotate(-90 50 50)"
                            />
                            <text x="50" y="50" dominantBaseline="middle" textAnchor="middle" fontSize="24" fontWeight="bold">{score}</text>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Parameters */}
            <div className="bg-card rounded-lg p-6 shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Parameter Breakdown</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { name: "Content Quality", score: 85, premium: false },
                        { name: "Metadata Optimization", score: 65, premium: false },
                        { name: "Mobile Responsiveness", score: 90, premium: false },
                        { name: "Schema Implementation", score: 45, premium: true },
                        { name: "Content Structure", score: 60, premium: true }
                    ].map((param, i) => (
                        <div key={i} className="bg-background p-4 rounded-lg border">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium">{param.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-sm ${param.score >= 70 ? "bg-green-100 text-green-800" :
                                    param.score >= 50 ? "bg-yellow-100 text-yellow-800" :
                                        "bg-red-100 text-red-800"
                                    }`}>
                                    {param.score}/100
                                </span>
                            </div>
                            {param.premium && !isPremium ? (
                                <div className="flex items-center text-muted-foreground">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <span>Premium feature</span>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {param.premium && isPremium ? "Premium analysis" : "Basic analysis"}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Recommendations */}
            <div className="bg-card rounded-lg p-6 shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Recommendations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { title: "Improve Meta Descriptions", difficulty: "Easy", impact: "Medium", premium: false },
                        { title: "Optimize Image Alt Text", difficulty: "Easy", impact: "Medium", premium: false },
                        { title: "Add Schema Markup", difficulty: "Medium", impact: "High", premium: true }
                    ].map((rec, i) => (
                        <div key={i} className="bg-background p-4 rounded-lg border">
                            <h3 className="font-medium mb-2">{rec.title}</h3>
                            {rec.premium && !isPremium ? (
                                <div className="flex items-center text-muted-foreground">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <span>Premium feature</span>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center mb-1">
                                        <span className="text-sm mr-2">Difficulty:</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${rec.difficulty === "Easy" ? "bg-green-100 text-green-800" :
                                            rec.difficulty === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                                "bg-red-100 text-red-800"
                                            }`}>
                                            {rec.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-sm mr-2">Impact:</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${rec.impact === "High" ? "bg-green-100 text-green-800" :
                                            rec.impact === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                                "bg-red-100 text-red-800"
                                            }`}>
                                            {rec.impact}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Upgrade CTA */}
            {!isPremium && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <h2 className="text-2xl font-bold mb-2">Unlock Premium Features</h2>
                    <p className="mb-4">Get detailed analysis, advanced recommendations, and competitor insights with our Premium plan.</p>
                    <a href="/pricing" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                        Upgrade to Premium
                    </a>
                </div>
            )}
        </div>
    );
}
