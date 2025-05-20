"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Lock } from "lucide-react"
import Link from "next/link"
import { ScoreGauge } from "@/components/score-gauge"
import { ParameterScoreCard } from "@/components/parameter-score-card"
import { RecommendationCard } from "@/components/recommendation-card"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface Parameter {
    name: string
    score: number
    isPremium: boolean
    description: string
}

interface Recommendation {
    title: string
    description: string
    difficulty: string
    impact: string
    isPremium: boolean
}

interface AnalysisResult {
    overall_score: number
    parameters: Parameter[]
    recommendations: Recommendation[]
}

export default function ResultsPage() {
    const searchParams = useSearchParams()
    const url = searchParams.get("url") || "example.com"
    const email = searchParams.get("email") || ""
    const industry = searchParams.get("industry") || ""
    const turnstileToken = searchParams.get("turnstileToken") || ""

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
    const [isPaid, setIsPaid] = useState(false)
    const [analysisCount, setAnalysisCount] = useState(0)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userRef = doc(db, "users", user.uid)
                const snap = await getDoc(userRef)
                const data = snap.exists() ? snap.data() : null
                setIsPaid(data?.isPaid || false)
                setAnalysisCount(data?.analysisCount || 0)
            }
        })
        return () => unsub()
    }, [])

    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            setError(null);

            console.log("Triggering fetch with:", { url, email, industry, turnstileToken });

            if (!turnstileToken || turnstileToken.length < 10) {
                setError("Missing or invalid CAPTCHA token. Please go back and try again.");
                setLoading(false);
                return;
            }

            if (!isPaid && analysisCount >= 1) {
                setError("You've reached your analysis limit. Upgrade to continue.");
                setLoading(false);
                return;
            }

            const cacheKey = `llm_analysis_${url}_${email}_${industry}_${turnstileToken}`;
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                console.log("Using cached result for:", url);
                setAnalysisResult(JSON.parse(cached));
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, email, industry, turnstileToken }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Analysis failed:", errorData);
                    throw new Error(errorData.message || 'Analysis failed');
                }

                const data = await response.json();
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
                setAnalysisResult(data);
            } catch (err) {
                console.error("Fetch error:", err);
                setError(err instanceof Error ? err.message : 'Failed to analyze website');
            } finally {
                setLoading(false);
            }
        };

        if (url) {
            fetchAnalysis();
        }
    }, [url, email, industry, turnstileToken, isPaid, analysisCount])

    if (loading) {
        return (
            <div className="container px-4 py-12 text-center">
                <h1 className="text-4xl font-bold mb-4">Analyzing Your Website</h1>
                <p className="text-lg text-muted-foreground">Please wait while we analyze {url}</p>
            </div>
        )
    }

    if (error || !analysisResult) {
        return (
            <div className="container px-4 py-12 text-center">
                <h1 className="text-4xl font-bold mb-4">Analysis Error</h1>
                <p className="text-lg text-muted-foreground">{error || "No results available for " + url}</p>
                <Button className="mt-6" onClick={() => window.location.href = "/"}>Try Again</Button>
                {!isPaid && error?.includes("limit") && (
                    <Button className="mt-4" asChild>
                        <Link href="/pricing">Upgrade to Premium</Link>
                    </Button>
                )}
            </div>
        )
    }

    const freeParams = analysisResult.parameters.filter(p => !p.isPremium)
    const premiumParams = analysisResult.parameters.filter(p => p.isPremium)
    const freeRecs = analysisResult.recommendations.filter(r => !r.isPremium)
    const premiumRecs = analysisResult.recommendations.filter(r => r.isPremium)

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
                <div className="container px-4 py-12">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">LLM Readiness Results</h1>
                        <p className="text-muted-foreground mt-1">Analysis for: <strong>{url}</strong></p>
                    </div>

                    {/* Overall Score Section */}
                    <div className="grid gap-6 md:grid-cols-3 mb-12">
                        <Card className="md:col-span-1">
                            <CardHeader>
                                <CardTitle>Overall Score</CardTitle>
                                <CardDescription>Your website's LLM readiness</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <ScoreGauge score={analysisResult.overall_score} />
                            </CardContent>
                            <CardFooter className="flex justify-center">
                                <Badge className={
                                    analysisResult.overall_score >= 80 ? "bg-green-600" :
                                        analysisResult.overall_score >= 60 ? "bg-yellow-600" : "bg-red-600"
                                }>
                                    {analysisResult.overall_score >= 80 ? "Excellent" : analysisResult.overall_score >= 60 ? "Good" : "Needs Improvement"}
                                </Badge>
                            </CardFooter>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Score Summary</CardTitle>
                                <CardDescription>Breakdown of your LLM readiness factors</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {analysisResult.parameters.map(param => (
                                    <div key={param.name} className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span>{param.name}</span>
                                                {param.isPremium && !isPremium && <Lock className="h-4 w-4 text-gray-400" />}
                                            </div>
                                            <span className="font-medium">
                                                {param.isPremium && !isPremium ? "Locked" : `${param.score}/100`}
                                            </span>
                                        </div>
                                        <Progress value={param.isPremium && !isPremium ? 100 : param.score} />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="parameters">
                        <TabsList className="grid grid-cols-2 w-full mb-4">
                            <TabsTrigger value="parameters">Parameter Breakdown</TabsTrigger>
                            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                        </TabsList>

                        <TabsContent value="parameters">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {freeParams.map(p => (
                                    <ParameterScoreCard key={p.name} {...p} />
                                ))}
                                {premiumParams.map(p => (
                                    <ParameterScoreCard key={p.name} {...p} isPremium={!isPremium} />
                                ))}
                            </div>
                            {!isPremium && (
                                <div className="mt-8 rounded-lg bg-blue-50 p-6 dark:bg-blue-950">
                                    <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Unlock Premium Parameters</h3>
                                    <p className="mt-2 text-blue-700 dark:text-blue-300">
                                        Upgrade to Premium to access all parameter scores and get a complete picture of your website's LLM readiness.
                                    </p>
                                    <Button className="mt-4 bg-blue-600 hover:bg-blue-700" asChild>
                                        <Link href="/pricing">
                                            Upgrade to Premium
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="recommendations">
                            <div className="grid gap-6 md:grid-cols-2">
                                {freeRecs.map((rec, i) => (
                                    <RecommendationCard
                                        key={i}
                                        title={rec.title}
                                        description={rec.description}
                                        difficulty={rec.difficulty as "Easy" | "Medium" | "Hard"}
                                        impact={rec.impact as "Low" | "Medium" | "High"}
                                        isPremium={false}
                                    />
                                ))}
                                {!isPremium && premiumRecs.map((rec, i) => (
                                    <RecommendationCard
                                        key={i}
                                        title={rec.title}
                                        description={rec.description}
                                        difficulty={rec.difficulty as "Easy" | "Medium" | "Hard"}
                                        impact={rec.impact as "Low" | "Medium" | "High"}
                                        isPremium
                                    />
                                ))}
                                {isPremium && premiumRecs.map((rec, i) => (
                                    <RecommendationCard
                                        key={i}
                                        title={rec.title}
                                        description={rec.description}
                                        difficulty={rec.difficulty as "Easy" | "Medium" | "Hard"}
                                        impact={rec.impact as "Low" | "Medium" | "High"}
                                    />
                                ))}
                            </div>
                            {!isPremium && (
                                <div className="mt-8 rounded-lg bg-blue-50 p-6 dark:bg-blue-950">
                                    <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Unlock Premium Recommendations</h3>
                                    <p className="mt-2 text-blue-700 dark:text-blue-300">
                                        Upgrade to Premium to access all recommendations and get detailed guidance on improving your website's LLM readiness.
                                    </p>
                                    <Button className="mt-4 bg-blue-600 hover:bg-blue-700" asChild>
                                        <Link href="/pricing">
                                            Upgrade to Premium
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <Card className="mt-12">
                        <CardHeader>
                            <CardTitle>Export Your Report</CardTitle>
                            <CardDescription>Save or share your LLM readiness analysis</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row gap-4">
                            <Button variant="outline">Download PDF</Button>
                            <Button variant="outline">Email Report</Button>
                            <Button variant="outline">Share Link</Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    )
}
