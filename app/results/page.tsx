// src/app/results/page.tsx
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
import { auth, db, onAuthStateChange } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import AuthGuard from "@/components/AuthGuard"
import type { User } from "firebase/auth"

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

export default function ResultsPageWrapper() {
    return (
        <AuthGuard>
            <ResultsPage />
        </AuthGuard>
    );
}

function ResultsPage() {
    const searchParams = useSearchParams()
    const url = searchParams.get("url") || "example.com"
    const queryEmail = searchParams.get("email") || ""
    const industry = searchParams.get("industry") || ""
    const turnstileToken = searchParams.get("turnstileToken") || ""

    const [userEmail, setUserEmail] = useState(queryEmail)
    const [isPremium, setIsPremium] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChange(async (user: User | null) => {
            if (user && user.email) {
                setUserEmail(user.email)
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : null;

                if (userData?.isPaid === true) {
                    setIsPremium(true);
                }
            }
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true)
            setError(null)

            const cacheKey = `llm_analysis_${url}_${userEmail}_${industry}_${turnstileToken}`
            const cached = sessionStorage.getItem(cacheKey)

            if (cached) {
                setAnalysisResult(JSON.parse(cached))
                setLoading(false)
                return
            }

            try {
                const response = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url, email: userEmail, industry, turnstileToken })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || "Analysis failed")
                }

                const data = await response.json()
                sessionStorage.setItem(cacheKey, JSON.stringify(data))
                setAnalysisResult(data)

                const user = auth.currentUser
                if (user) {
                    const userRef = doc(db, "users", user.uid)
                    const userSnap = await getDoc(userRef)
                    if (userSnap.exists()) {
                        await updateDoc(userRef, {
                            lastUsedAt: serverTimestamp(),
                            analysisCount: increment(1),
                        })
                    } else {
                        await setDoc(userRef, {
                            uid: user.uid,
                            email: user.email,
                            createdAt: serverTimestamp(),
                            lastUsedAt: serverTimestamp(),
                            analysisCount: 1,
                            isPaid: false,
                        })
                    }
                }
            } catch (err) {
                console.error(err)
                setError(err instanceof Error ? err.message : "Failed to analyze website")
            } finally {
                setLoading(false)
            }
        }

        if (url) {
            fetchAnalysis()
        }
    }, [url, userEmail, industry, turnstileToken])

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
                    {/* ...remaining JSX remains unchanged... */}
                </div>
            </main>
            <Footer />
        </div>
    )
}
