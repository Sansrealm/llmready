"use client"
import type { User } from "firebase/auth";
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
import { onAuthStateChange, auth } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"

export default function ResultsPage() {
    const searchParams = useSearchParams()
    const rawUrl = searchParams.get("url") || ""
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isEmailing, setIsEmailing] = useState(false)
    const [user, setUser] = useState<User | null>(null);
    const isPremium = false; // ⛔ TEMPORARY placeholder
    const freeParams: any[] = analysisResult?.parameters?.filter((p: any) => !p.isPremium) || [];
    const premiumParams: any[] = analysisResult?.parameters?.filter((p: any) => p.isPremium) || [];
    const freeRecs: any[] = analysisResult?.recommendations?.filter((r: any) => !r.isPremium) || [];
    const premiumRecs: any[] = analysisResult?.recommendations?.filter((r: any) => r.isPremium) || [];

    useEffect(() => {
        const unsubscribe = onAuthStateChange((currentUser: User | null) => {
            setUser(currentUser);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await fetch(`/api/analyze`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: rawUrl }),
                });
                const data = await res.json();

                if (!data || typeof data.overall_score !== "number") {
                    console.error("Invalid analysis response:", data);
                    toast.error("Failed to load analysis results. Please try again.");
                    return;
                }

                setAnalysisResult(data);
            } catch (err) {
                console.error("Error fetching result:", err);
                toast.error("Something went wrong fetching the analysis.");
            }
        };

        if (rawUrl) fetchResult();
    }, [rawUrl]);

    const handleEmailReport = async () => {
        if (!user) {
            toast.error("Please log in to receive the report via email.");
            return;
        }
        setIsEmailing(true);
        try {
            const res = await fetch("/api/generate-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.uid,
                    email: user.email,
                    websiteUrl: rawUrl,
                    analysisData: analysisResult
                })
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Report emailed successfully! Check your inbox.");
            } else {
                toast.error(json.error || "Failed to send report.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong while emailing the report.");
        } finally {
            setIsEmailing(false);
        }
    }

    return (
        <div>
            <Navbar />
            <main className="flex-1">
                <div className="container px-4 py-12">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">LLM Readiness Results</h1>
                        <p className="text-muted-foreground mt-1">Analysis for: <strong>{rawUrl}</strong></p>
                    </div>
                </div>

                {analysisResult ? (
                    <>
                        {/* Overall Score Section */}
                        <div className="grid gap-6 md:grid-cols-3 mb-12">
                            <Card className="md:col-span-1">
                                <CardHeader>
                                    <CardTitle>Overall Score</CardTitle>
                                    <CardDescription>Your website's LLM readiness</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center">
                                    <ScoreGauge score={analysisResult?.overall_score} />
                                </CardContent>
                                <CardFooter className="flex justify-center">
                                    <Badge className={
                                        analysisResult.overall_score >= 80 ? "bg-green-600" :
                                            analysisResult.overall_score >= 60 ? "bg-yellow-600" : "bg-red-600"
                                    }>
                                        {analysisResult.overall_score >= 80 ? "Excellent" :
                                            analysisResult.overall_score >= 60 ? "Good" : "Needs Improvement"}
                                    </Badge>
                                </CardFooter>
                            </Card>

                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Score Summary</CardTitle>
                                    <CardDescription>Breakdown of your LLM readiness factors</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {analysisResult.parameters.map((param: any) => (
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

                        {/* Tabs Section */}
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

                        {/* Export Section */}
                        <Card className="mt-12">
                            <CardHeader>
                                <CardTitle>Export Your Report</CardTitle>
                                <CardDescription>Save or share your LLM readiness analysis</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row gap-4">
                                <Button variant="outline">Download PDF</Button>
                                <Button variant="outline" onClick={handleEmailReport} disabled={isEmailing}>
                                    {isEmailing ? "Sending..." : "Email Report"}
                                </Button>
                                <Button variant="outline">Share Link</Button>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <p className="text-muted-foreground text-center py-12">Loading analysis result...</p>
                )}
            </main>
            <Footer />
        </div>
    );
}