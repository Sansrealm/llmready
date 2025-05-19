"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Lock } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ScoreGauge } from "@/components/score-gauge"
import { ParameterScoreCard } from "@/components/parameter-score-card"
import { RecommendationCard } from "@/components/recommendation-card"

export default function ResultsPage() {
  const [isPremium] = useState(false)

  // Sample data - in a real app, this would come from an API
  const overallScore = 68
  const parameters = [
    {
      name: "Content Quality",
      score: 75,
      isPremium: false,
      description: "How well your content is structured and written for LLMs",
    },
    {
      name: "Metadata Optimization",
      score: 60,
      isPremium: false,
      description: "Proper implementation of meta tags and descriptions",
    },
    {
      name: "Schema Implementation",
      score: 45,
      isPremium: true,
      description: "Structured data markup for better AI understanding",
    },
    {
      name: "Content Structure",
      score: 82,
      isPremium: true,
      description: "Logical organization of content and headings",
    },
    {
      name: "Mobile Responsiveness",
      score: 90,
      isPremium: false,
      description: "How well your site performs on mobile devices",
    },
  ]

  const recommendations = [
    {
      title: "Improve Meta Descriptions",
      description:
        "Your meta descriptions are too short or missing on 12 pages. Add descriptive meta descriptions to help LLMs understand your content.",
      difficulty: "Easy",
      impact: "Medium",
      isPremium: false,
    },
    {
      title: "Add Schema Markup",
      description:
        "Implement schema.org markup for your main content types to provide context to LLMs about your content structure.",
      difficulty: "Medium",
      impact: "High",
      isPremium: true,
    },
    {
      title: "Fix Heading Structure",
      description:
        "Your heading hierarchy is inconsistent. Ensure proper use of H1-H6 tags to help LLMs understand content importance.",
      difficulty: "Easy",
      impact: "High",
      isPremium: true,
    },
    {
      title: "Optimize Image Alt Text",
      description: "Many images are missing alt text. Add descriptive alt text to help LLMs understand image content.",
      difficulty: "Easy",
      impact: "Medium",
      isPremium: false,
    },
  ]

  const freeParameters = parameters.filter((p) => !p.isPremium)
  const premiumParameters = parameters.filter((p) => p.isPremium)
  const freeRecommendations = recommendations.filter((r) => !r.isPremium)
  const premiumRecommendations = recommendations.filter((r) => r.isPremium)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container px-4 py-8 md:px-6 md:py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">LLM Readiness Results</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Analysis for: <span className="font-medium text-gray-900 dark:text-gray-100">example.com</span>
            </p>
          </div>

          {/* Overall Score Section */}
          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Overall Score</CardTitle>
                <CardDescription>Your website's LLM readiness</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ScoreGauge score={overallScore} />
              </CardContent>
              <CardFooter className="flex justify-center">
                {overallScore >= 80 ? (
                  <Badge className="bg-green-600">Excellent</Badge>
                ) : overallScore >= 60 ? (
                  <Badge className="bg-yellow-600">Good</Badge>
                ) : (
                  <Badge className="bg-red-600">Needs Improvement</Badge>
                )}
              </CardFooter>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Score Summary</CardTitle>
                <CardDescription>Breakdown of your LLM readiness factors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parameters.map((param) => (
                  <div key={param.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{param.name}</span>
                        {param.isPremium && !isPremium && <Lock className="h-4 w-4 text-gray-400" />}
                      </div>
                      <span className="font-medium">
                        {param.isPremium && !isPremium ? "Locked" : `${param.score}/100`}
                      </span>
                    </div>
                    <Progress
                      value={param.isPremium && !isPremium ? 100 : param.score}
                      className={param.isPremium && !isPremium ? "bg-gray-200" : ""}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis Tabs */}
          <Tabs defaultValue="parameters" className="mb-12">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="parameters">Parameter Breakdown</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="parameters" className="mt-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {freeParameters.map((param) => (
                  <ParameterScoreCard
                    key={param.name}
                    name={param.name}
                    score={param.score}
                    description={param.description}
                  />
                ))}

                {premiumParameters.map((param) => (
                  <ParameterScoreCard
                    key={param.name}
                    name={param.name}
                    score={param.score}
                    description={param.description}
                    isPremium={!isPremium}
                  />
                ))}
              </div>

              {!isPremium && (
                <div className="mt-8 rounded-lg bg-blue-50 p-6 dark:bg-blue-950">
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Unlock Premium Parameters</h3>
                  <p className="mt-2 text-blue-700 dark:text-blue-300">
                    Upgrade to Premium to access all parameter scores and get a complete picture of your website's LLM
                    readiness.
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

            <TabsContent value="recommendations" className="mt-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {freeRecommendations.map((rec, index) => (
                  <RecommendationCard
                    key={index}
                    title={rec.title}
                    description={rec.description}
                    difficulty={rec.difficulty}
                    impact={rec.impact}
                  />
                ))}

                {!isPremium &&
                  premiumRecommendations.map((rec, index) => (
                    <RecommendationCard
                      key={index}
                      title={rec.title}
                      description={rec.description}
                      difficulty={rec.difficulty}
                      impact={rec.impact}
                      isPremium={true}
                    />
                  ))}

                {isPremium &&
                  premiumRecommendations.map((rec, index) => (
                    <RecommendationCard
                      key={index}
                      title={rec.title}
                      description={rec.description}
                      difficulty={rec.difficulty}
                      impact={rec.impact}
                    />
                  ))}
              </div>

              {!isPremium && (
                <div className="mt-8 rounded-lg bg-blue-50 p-6 dark:bg-blue-950">
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                    Unlock Premium Recommendations
                  </h3>
                  <p className="mt-2 text-blue-700 dark:text-blue-300">
                    Upgrade to Premium to access all recommendations and get detailed guidance on improving your
                    website's LLM readiness.
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

          {/* Export Report Section */}
          <Card>
            <CardHeader>
              <CardTitle>Export Your Report</CardTitle>
              <CardDescription>Save or share your LLM readiness analysis</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row">
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
