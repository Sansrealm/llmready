//app/page.tsx - Updated with server-side subscription check and usage limits
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
import { AlertCircle, Info } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

// Updated premium check that uses server-side API (same as pricing page)
function useIsPremium() {
  const { user, isLoaded } = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debug, setDebug] = useState<any>({});
  const [usageInfo, setUsageInfo] = useState<any>(null);

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
        
        // Get usage info if available
        if (data.usageInfo) {
          setUsageInfo(data.usageInfo);
        }

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
    usageInfo,
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
  const { isPremium, isLoading: premiumLoading, debug, usageInfo } = useIsPremium();

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

    // For signed-in users, check if they're premium to determine limits
    if (!isSignedIn) {
      if (analysisCount >= 3) { // Updated to allow 3 analyses for non-logged users
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

  // Check if user has reached their limit
  const isLimitReached = isLoaded && (
    (!isSignedIn && analysisCount >= 3) || // Guest limit (3 analyses)
    (isSignedIn && !isPremium && usageInfo && usageInfo.remainingAnalyses <= 0) // Free user limit
  );

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
                  Is Your Website <span className="text-green-600 dark:text-green-500">LLM Ready</span>?
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Analyze your website's readiness for Large Language Models and improve your visibility in AI-powered search.
                </p>
              </div>

              {/* Premium status indicator for signed-in users */}
              {isSignedIn && !premiumLoading && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg inline-block">
                  <p className="text-sm">
                    Current Plan: <span className={`font-medium ${isPremium ? 'text-green-600' : 'text-blue-600'}`}>
                      {isPremium ? 'Premium ✅' : 'Free'}
                    </span>
                  </p>
                  
                  {/* Display remaining analyses for logged-in users */}
                  {usageInfo && (
                    <p className="text-sm mt-1">
                      <span className="text-gray-600">Remaining analyses:</span>{' '}
                      <span className={`font-medium ${usageInfo.remainingAnalyses > 5 ? 'text-green-600' : usageInfo.remainingAnalyses > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {usageInfo.remainingAnalyses} / {usageInfo.monthlyLimit}
                      </span>
                    </p>
                  )}
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
                    {usageInfo && (
                      <div className="mt-2">
                        <strong>Usage Info:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(usageInfo, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="w-full max-w-md space-y-2">
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
                    <Input
                      type="email"
                      placeholder="Email (optional)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
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

                  {/* Usage info based on user type */}
                  {!isSignedIn && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Info className="h-4 w-4" />
                      <p>
                        Guest users can analyze up to 3 websites. 
                        <span className="ml-1">
                          {analysisCount > 0 && `(${3 - analysisCount} remaining)`}
                        </span>
                      </p>
                    </div>
                  )}

                  {isSignedIn && !premiumLoading && !isPremium && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Info className="h-4 w-4" />
                      <p>
                        Free plan: 10 analyses per month. 
                        {usageInfo && (
                          <span className="ml-1">
                            ({usageInfo.remainingAnalyses} remaining)
                          </span>
                        )}
                        {' '}
                        <Link href="/pricing" className="text-blue-500 hover:underline">
                          Upgrade to Premium
                        </Link> for 100/month.
                      </p>
                    </div>
                  )}

                  {isSignedIn && !premiumLoading && isPremium && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Info className="h-4 w-4" />
                      <p>
                        Premium plan: 100 analyses per month.
                        {usageInfo && (
                          <span className="ml-1">
                            ({usageInfo.remainingAnalyses} remaining)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={!isLoaded || isSubmitting || isLimitReached || premiumLoading} 
                    className="w-full"
                  >
                    {isSubmitting
                      ? "Analyzing..."
                      : premiumLoading
                        ? "Loading..."
                        : isLimitReached
                          ? "Analysis Limit Reached"
                          : "Analyze"}
                  </Button>

                  {/* Limit reached messaging for guests */}
                  {!isSignedIn && isLimitReached && (
                    <div className="mt-4 text-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                      <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                        Want more website checks?
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create an account to get 10 analyses per month
                      </p>
                      <Button
                        className="mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        asChild
                      >
                        <Link href="/login">Sign Up or Log In</Link>
                      </Button>
                    </div>
                  )}

                  {/* Limit reached messaging for free users */}
                  {isSignedIn && !premiumLoading && !isPremium && usageInfo && usageInfo.remainingAnalyses <= 0 && (
                    <div className="mt-4 text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                        Monthly analysis limit reached
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upgrade to Premium for 100 analyses per month
                      </p>
                      <Button
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        asChild
                      >
                        <Link href="/pricing">Upgrade to Premium</Link>
                      </Button>
                    </div>
                  )}

                  {/* Show upgrade CTA for signed-in free users with remaining analyses */}
                  {isSignedIn && !premiumLoading && !isPremium && usageInfo && usageInfo.remainingAnalyses > 0 && (
                    <div className="mt-4 text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                        Premium Benefits Available
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get 100 analyses per month, advanced insights, and more
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
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
