//app/page.tsx - Updated with server-side subscription check
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link"
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, BarChart2, Code2, FileText, Zap, Eye, History } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ScreenshotCarousel } from "@/components/screenshot-carousel";
import { DebugInfo } from "@/lib/types";


// Updated premium check that uses server-side API (same as pricing page)
function useIsPremium() {
  const { user, isLoaded } = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debug, setDebug] = useState<DebugInfo>({});
  // Step 2: Fix initial state flash - use null to indicate "not yet loaded"
  const [canAnalyze, setCanAnalyze] = useState<boolean | null>(null);
  const [remainingAnalyses, setRemainingAnalyses] = useState(0);

  useEffect(() => {
    async function checkSubscriptionStatus() {
      // Step 1: Fetch immediately on mount, even for unauthenticated users
      if (!isLoaded) {
        return;
      }

      // For unauthenticated users, set defaults immediately
      if (!user) {
        setIsPremium(false);
        setCanAnalyze(true); // Guests can analyze (handled separately)
        setRemainingAnalyses(0);
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching subscription status from server...');

        const response = await fetch('/api/subscription-status');
        const data = await response.json();

        console.log('✅ Server response:', data);

        // Step 1: Use server as source of truth - set ALL values from response
        setIsPremium(data.isPremium || false);
        setCanAnalyze(data.canAnalyze); // Direct from server, no fallback
        setRemainingAnalyses(data.remainingAnalyses || 0);
        setDebug(data.debug || {});

      } catch (error) {
        console.error('❌ Failed to check subscription status:', error);
        // On error, assume they can't analyze (safe default)
        setIsPremium(false);
        setCanAnalyze(false);
        setRemainingAnalyses(0);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscriptionStatus();
  }, [user, isLoaded]);

  return {
    isPremium,
    canAnalyze,
    remainingAnalyses,
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



export default function Home() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [analysisCount, setAnalysisCount] = useState(0);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Use the same server-side subscription check as pricing page
  const { isPremium, canAnalyze, remainingAnalyses, isLoading: premiumLoading, debug } = useIsPremium();

  // Load guest usage count from localStorage
  useEffect(() => {
    const storedCount = localStorage.getItem("guestAnalysisCount");
    if (storedCount) {
      setAnalysisCount(parseInt(storedCount, 10));
    }
  }, []);

  // Resume pending submission after login
  useEffect(() => {
    const pendingUrl = sessionStorage.getItem("pendingURL");
    if (pendingUrl && isSignedIn) {
      const pendingIndustry = sessionStorage.getItem("pendingIndustry") || "";
      const pendingEmail = sessionStorage.getItem("pendingEmail") || "";

      sessionStorage.removeItem("pendingURL");
      sessionStorage.removeItem("pendingIndustry");
      sessionStorage.removeItem("pendingEmail");

      router.push(
        `/results?url=${encodeURIComponent(pendingUrl)}&email=${encodeURIComponent(pendingEmail)}&industry=${encodeURIComponent(
          pendingIndustry
        )}`
      );
    }
  }, [router, isSignedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (!url.trim()) return alert("Please enter a valid URL");

    let processedUrl = url.trim();
    try {
      new URL(processedUrl);
    } catch {
      processedUrl = "https://" + processedUrl;
    }

    // Check limits for both guest and signed-in free users
    if (!isSignedIn) {
      if (analysisCount >= 1) {
        setShowLoginAlert(true);
        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
        return;
      }

      sessionStorage.setItem("pendingURL", processedUrl);
      sessionStorage.setItem("pendingIndustry", industry);
      sessionStorage.setItem("pendingEmail", email);

      const newCount = analysisCount + 1;
      setAnalysisCount(newCount);
      localStorage.setItem("guestAnalysisCount", newCount.toString());
    } else if (!isPremium && canAnalyze === false) {
      // Step 3: Signed-in free user has reached limit (strict server check)
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
      return;
    }

    // Proceed to results
    setIsSubmitting(true);
    try {
      router.push(
        `/results?url=${encodeURIComponent(processedUrl)}&email=${encodeURIComponent(email)}&industry=${encodeURIComponent(
          industry
        )}`
      );
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Refine isLimitReached - strictly use server-returned values
  const isLimitReached = isLoaded && (
    (!isSignedIn && analysisCount >= 1) || // Guest limit (localStorage)
    (isSignedIn && !isPremium && !premiumLoading && canAnalyze === false) // Free user limit (server)
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://llmcheck.app/#software",
        "name": "LLM Check",
        "url": "https://llmcheck.app",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "An AI-Search Optimization (AEO) platform that audits brand visibility and citation rates across ChatGPT, Gemini, and Perplexity.",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
      },
      {
        "@type": "WebSite",
        "url": "https://llmcheck.app",
        "name": "LLM Check",
        "description": "AI-Search Optimization platform for checking and improving brand visibility across ChatGPT, Gemini, and Perplexity."
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is Answer Engine Optimization (AEO)?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Answer Engine Optimization (AEO) is the technical process of structuring website content to be accurately retrieved, synthesized, and cited by Large Language Models such as ChatGPT, Gemini, and Perplexity. Unlike traditional SEO, which focuses on click-through rates from keyword rankings, AEO focuses on Citation Velocity and Entity Authority within generative AI responses."
            }
          },
          {
            "@type": "Question",
            "name": "What is the Weighted Visibility Score (WVS)?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The Weighted Visibility Score (WVS) is a metric developed by LLM Check to quantify a brand's Share of Voice in AI search. It weights four factors: Mention Rate (frequency of brand appearance across 5 intent-based prompts), Prominence (positional rank within LLM recommendation lists), Sentiment Alignment (accuracy of the LLM description of the brand), and Provenance (presence of a direct source link to the brand's domain)."
            }
          },
          {
            "@type": "Question",
            "name": "How do I increase my brand's visibility in ChatGPT and Perplexity?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "To increase AI visibility, implement the AEO framework: use Atomic Answers (40–60 word direct summaries) immediately under H2 question headers, ensure fully valid JSON-LD schema markup, and focus on Information Gain by providing unique data points and expert attributions that AI models can cite as primary sources."
            }
          },
          {
            "@type": "Question",
            "name": "What are common AI visibility blockers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The three most common AI visibility blockers are: Semantic Drift (brand language that differs from an LLM's training vocabulary for that category), Citation Walls (aggressive WAF settings or JavaScript-only rendering that prevent AI retrieval crawlers from verifying site claims), and Information Thinness (content lacking unique data points or expert attributions, causing LLMs to prefer more data-dense competitors)."
            }
          },
          {
            "@type": "Question",
            "name": "What is LLM Check?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "LLM Check is an AI-Search Optimization (AEO) platform that analyzes websites for LLM readiness and measures brand visibility across ChatGPT, Gemini, and Perplexity. It provides an overall LLM Readiness Score, detailed parameter analysis, prioritized recommendations, and an AI Visibility Check that tests whether a brand is recommended when users search for its products or services in AI assistants."
            }
          },
          {
            "@type": "Question",
            "name": "What is the difference between SEO and AEO?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Traditional SEO targets keyword-based search rankings (positions 1–10 on Google) through crawler-based indexing, optimizing for search volume and click-through traffic. AEO (Answer Engine Optimization) targets citation in generative AI answers through training data and RAG retrieval, optimizing for semantic density and information gain. The primary AEO metric is the Weighted Visibility Score (WVS), not keyword position."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Login Alert */}
        {showLoginAlert && (
          <div className="container px-4 md:px-6 mt-4">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Free analysis limit reached</AlertTitle>
              <AlertDescription>
                You've reached the limit for free website analyses. Please log in or create an account to continue.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-blue-50 dark:from-gray-950 dark:to-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Is AI sending your customers to a competitor?
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Don&apos;t be invisible in the new search era. Find out if ChatGPT, Gemini, and Perplexity are recommending your brand—and get the exact roadmap to fix it.
                </p>
              </div>

              <ScreenshotCarousel />

              {/* Premium status indicator for signed-in users */}
              {isSignedIn && !premiumLoading && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg inline-block">
                  <p className="text-sm">
                    Current Plan: <span className={`font-medium ${isPremium ? 'text-green-600' : 'text-blue-600'}`}>
                      {isPremium ? 'Premium ✅' : 'Free'}
                    </span>
                  </p>
                </div>
              )}

              {/* Debug info for development */}
              {isSignedIn && process.env.NODE_ENV === 'development' && !premiumLoading && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left text-xs max-w-md">
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

              <div id="analyze-form" className="w-full max-w-md mt-6 mb-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm shadow-sm px-6 py-7">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Enter your website URL"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Email (optional)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      {email && (
                        <p className="text-xs text-muted-foreground">
                          By using this service you agree to your email being used for product updates and offers.{' '}
                          <Link href="/privacy" className="underline hover:text-foreground">
                            Privacy Policy
                          </Link>
                        </p>
                      )}
                    </div>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="saas">SaaS</SelectItem>
                        <SelectItem value="media">Media & Publishing</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Updated usage info based on subscription status */}
                  {!isSignedIn && analysisCount === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Free scan. See your AI Visibility Score in under 60 seconds.
                    </p>
                  )}

                  {isSignedIn && !premiumLoading && !isPremium && canAnalyze === true && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You have <strong>{remainingAnalyses}</strong> free analyses remaining. <Link href="/pricing" className="text-blue-500 hover:underline">Upgrade to Premium</Link> for 25 analyses per month.
                    </p>
                  )}

                  {/* {isSignedIn && !premiumLoading && isPremium && (
                    // <p className="text-sm text-green-600 dark:text-green-400">
                    //   Premium plan: Unlimited website analyses ✅
                    // </p>
                  )} */}

                  <Button
                    type="submit"
                    disabled={
                      !isLoaded ||
                      isSubmitting ||
                      isLimitReached ||
                      premiumLoading ||
                      (isSignedIn && canAnalyze === null) // Step 2: Disable while loading server state
                    }
                    className="w-full"
                  >
                    {isSubmitting
                      ? "Analyzing..."
                      : premiumLoading || (isSignedIn && canAnalyze === null)
                        ? "Loading..." // Step 2: Show loading until server confirms
                        : isLimitReached
                          ? "Analysis Limit Reached"
                          : "Analyze My AI Visibility"}
                  </Button>

                  {isLimitReached && (
                    <div className="mt-4 text-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                      <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                        {isSignedIn && !isPremium
                          ? "You've reached the free analysis limit"
                          : !isSignedIn && analysisCount >= 1
                            ? "Sign in for more free analysis"
                            : "Want unlimited website checks?"
                        }
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isSignedIn && !isPremium
                          ? "Upgrade to Premium for 25 analyses per month"
                          : !isSignedIn && analysisCount >= 1
                            ? "Get 3 free analyses when you create an account"
                            : "Unlock full access to LLM readiness audits with premium"
                        }
                      </p>
                      <Button
                        className="mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        asChild
                      >
                        <Link href={isSignedIn ? "/pricing" : "/login"}>
                          {isSignedIn ? "Upgrade to Premium" : "Sign In"}
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Show upgrade CTA for signed-in free users (only when not at limit) */}
                  {isSignedIn && !premiumLoading && !isPremium && canAnalyze === true && (
                    <div className="mt-4 text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                        Premium Benefits Available
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get unlimited analyses, advanced insights, and more
                      </p>
                      <Button
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        asChild
                      >
                        <Link href="/pricing">View Premium Plans</Link>
                      </Button>
                    </div>
                  )}
                </form>
              </div>

              {/* Feature showcase */}
              <div className="w-full max-w-2xl mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-center mb-5">
                  Everything you need to win AI search
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">

                  <div className="flex gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                      <BarChart2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">LLM Readiness Score</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Instant score out of 100 showing exactly how AI-ready your site is today.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Structured Data Analysis</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Schema markup, metadata, and technical signals AI models use to understand your content.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Content Clarity Check</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Measures how clearly your content communicates to large language models like ChatGPT and Gemini.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Actionable Recommendations</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Prioritised fixes ranked by impact so you know exactly what to improve first.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        Score History
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Premium</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track your improvements over time and see how your score changes with every update.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                        AI Visibility Check
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">See if your website is recommended by ChatGPT, Gemini, and Perplexity when users search for your products or services.</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Competitive advantage section */}
        <section className="w-full py-16 bg-gray-950 dark:bg-black">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-500">
                The AI search era is already here
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-white leading-tight">
                Your competitors are already showing up in AI results.{" "}
                <span className="text-green-400">Are you?</span>
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
                ChatGPT, Gemini, and Perplexity are now the first stop for millions of buying decisions.
                Businesses that optimise for AI visibility today will dominate their category tomorrow —
                those that don't will become invisible.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-left">
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white">60%+</p>
                  <p className="text-sm text-gray-400">of online searches now involve an AI assistant at some point in the journey</p>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white">#1 position</p>
                  <p className="text-sm text-gray-400">in AI results drives more trust than any traditional search ranking</p>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white">Most sites</p>
                  <p className="text-sm text-gray-400">fail basic AI readiness checks — a huge opportunity for those who act now</p>
                </div>
              </div>
              <p className="text-base font-semibold text-green-400 pt-2">
                Know where you stand. Fix what matters. Get ahead — and stay there.
              </p>
              <div className="pt-2">
                <a
                  href="#analyze-form"
                  className="inline-block bg-green-500 hover:bg-green-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  Start Today — It&apos;s Free
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SEO vs AEO Comparison Table */}
        <section className="w-full py-16 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Methodology</p>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Traditional SEO vs. Answer Engine Optimization (AEO)
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                AI assistants don&apos;t rank pages — they cite sources. AEO is the discipline of becoming that source.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 w-1/3">Feature</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Traditional SEO</th>
                    <th className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">LLM-Ready (AEO)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    ["Primary Goal", "Ranking for Keywords", "Citation in Generative Answers"],
                    ["Indexing", "Crawler-based (Googlebot)", "Training Data + RAG Retrieval"],
                    ["Content Focus", "Search Volume / Traffic", "Semantic Density / Information Gain"],
                    ["Primary Metric", "Position 1–10", "Weighted Visibility Score (WVS)"],
                    ["User Intent", "Discovery via Browsing", "Direct Recommendation via Logic"],
                  ].map(([feature, seo, aeo]) => (
                    <tr key={feature} className="bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{feature}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{seo}</td>
                      <td className="px-6 py-4 text-indigo-700 dark:text-indigo-300 font-medium">{aeo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* AEO Technical Glossary */}
        <section className="w-full py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Knowledge Base</p>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                AEO Technical Glossary
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400">
                Precise definitions for AI search optimization concepts.
              </p>
            </div>
            <div className="space-y-8">

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  What is Answer Engine Optimization (AEO)?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Answer Engine Optimization (AEO) is the technical process of structuring website content to be accurately retrieved, synthesized, and cited by Large Language Models (LLMs) like ChatGPT, Gemini, and Perplexity. Unlike traditional SEO, which focuses on click-through rates from blue links, AEO focuses on <strong>Citation Velocity</strong> and <strong>Entity Authority</strong> within generative responses.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  What is the Weighted Visibility Score (WVS)?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  The Weighted Visibility Score is a proprietary metric developed by LLM Check to quantify a brand&apos;s &quot;Share of Voice&quot; in AI search. It calculates visibility by weighting four distinct factors:
                </p>
                <ol className="mt-3 space-y-1.5 list-decimal list-inside text-gray-600 dark:text-gray-400">
                  <li><strong>Mention Rate:</strong> The frequency of brand appearance across 5 intent-based prompts.</li>
                  <li><strong>Prominence:</strong> The positional rank of the brand within an LLM&apos;s recommendation list.</li>
                  <li><strong>Sentiment Alignment:</strong> The accuracy of the LLM&apos;s description of the brand&apos;s core features.</li>
                  <li><strong>Provenance:</strong> The presence of a direct, clickable source link back to the brand&apos;s domain.</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  What are common AI visibility blockers?
                </h3>
                <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                  <li>
                    <strong className="text-gray-800 dark:text-gray-200">Semantic Drift</strong> — When a brand&apos;s marketing language uses non-standard jargon that differs from the LLM&apos;s training data for that category, causing misalignment between how the brand describes itself and how AI models understand it.
                  </li>
                  <li>
                    <strong className="text-gray-800 dark:text-gray-200">Citation Walls</strong> — Technical barriers such as aggressive WAF settings or JavaScript-only rendering that prevent AI retrieval crawlers (OAI-SearchBot, PerplexityBot) from verifying site claims.
                  </li>
                  <li>
                    <strong className="text-gray-800 dark:text-gray-200">Information Thinness</strong> — Content that lacks unique data points, proprietary statistics, or expert attributions, causing LLMs to prefer more data-dense competitors as primary sources.
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* LLM-Ready Protocol Checklist */}
        <section className="w-full py-16 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">Methodology</p>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                The LLM-Ready Protocol
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400">
                The technical checklist LLM Check uses to establish whether a site is citable by AI assistants.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Atomic Answers",
                  desc: "A 40–60 word direct answer placed immediately after every H2 question header, giving AI retrieval systems a clean, extractable response without ambiguity.",
                },
                {
                  title: "Entity Mapping",
                  desc: "Explicitly linking your brand to known industry entities (e.g. SaaS, SEO, AI) so LLMs can place you in the correct knowledge category during retrieval.",
                },
                {
                  title: "Freshness Signal",
                  desc: "Maintaining a dateModified property in JSON-LD schema to signal temporal relevance to AI crawlers that prioritize recently updated primary sources.",
                },
                {
                  title: "Markdown Parity",
                  desc: "Ensuring site content is fully readable when CSS and JavaScript are stripped — the format in which text-only AI agents and RAG pipelines ingest web content.",
                },
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-4 p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <a
                href="#analyze-form"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                Check Your Site Now — It&apos;s Free
              </a>
            </div>
          </div>
        </section>

        {/* JSON-LD structured data for AI crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

      </main>
      <Footer />
    </div>
  );
}