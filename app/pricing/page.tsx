"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, ChevronRight, X, RefreshCw } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPremiumState, setIsPremiumState] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initial check from Clerk
  const isPremiumFromClerk = user?.publicMetadata?.premiumUser === true;

  // Effect to set initial state
  useEffect(() => {
    if (isPremiumFromClerk) {
      setIsPremiumState(true);
    }
  }, [isPremiumFromClerk]);

  // Enhanced refresh function for production use
  const refreshSession = async (maxRetries = 3) => {
    if (!user) return false;

    setRefreshing(true);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Refresh attempt ${attempt}/${maxRetries}`);

        // Force Clerk to refetch user data
        await user.reload();

        const isPremium = user.publicMetadata?.premiumUser === true;
        console.log(`Attempt ${attempt} - Premium status:`, isPremium);

        if (isPremium) {
          // Success! Premium status found
          setIsPremiumState(true);
          setRefreshing(false);
          return true;
        }

        // If not premium and not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          console.log(`Waiting 5 seconds before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

      } catch (error) {
        console.error(`Refresh attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          setRefreshing(false);
          return false;
        }

        // Wait before retrying on error
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // All attempts failed
    setIsPremiumState(false);
    setRefreshing(false);
    return false;
  };

  // Use the local state for premium checks
  const isPremium = isPremiumState;

  const handleSubscribe = async () => {
    if (!isSignedIn) {
      // If not signed in, redirect to login page
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      // Get user email from Clerk
      const userEmail = user?.primaryEmailAddress?.emailAddress;

      if (!userEmail) {
        throw new Error("Could not retrieve your email address");
      }

      // Include email in the request body
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Checkout error:", errorData);
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Failed to create checkout session:", data.error);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Subscription error: ${error.message || 'Unknown error'}. Please try again.`);
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);

    try {
      // Get user email from Clerk
      const userEmail = user?.primaryEmailAddress?.emailAddress;

      if (!userEmail) {
        throw new Error("Could not retrieve your email address");
      }

      const response = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Failed to create portal session:", data.error);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Subscription management error: ${error.message || 'Unknown error'}. Please try again.`);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-blue-50 dark:from-gray-950 dark:to-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    Simple, Transparent Pricing
                  </h1>
                  {isSignedIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshSession()}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh Status'}
                    </Button>
                  )}
                </div>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Choose the plan that fits your needs. No hidden fees or surprises.
                </p>
                {/* Premium status indicator */}
                {isSignedIn && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg inline-block">
                    <p className="text-sm">
                      Current Plan: <span className={`font-medium ${isPremium ? 'text-green-600' : 'text-blue-600'}`}>
                        {isPremium ? 'Premium' : 'Free'}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Free</CardTitle>
                  <CardDescription>Basic LLM readiness assessment</CardDescription>
                  <div className="mt-4 text-4xl font-bold">$0</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Basic website analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Content quality score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Basic metadata analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Mobile responsiveness check</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <X className="h-5 w-5 text-gray-300" />
                    <span>Advanced schema analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <X className="h-5 w-5 text-gray-300" />
                    <span>Content structure analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <X className="h-5 w-5 text-gray-300" />
                    <span>Detailed recommendations</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <X className="h-5 w-5 text-gray-300" />
                    <span>Weekly monitoring</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <X className="h-5 w-5 text-gray-300" />
                    <span>Keyword and Industry based Analysis</span>
                  </div>
                </CardContent>
                <CardFooter>
                  {!isSignedIn && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/login">Sign Up Free</Link>
                    </Button>
                  )}
                  {isSignedIn && !isPremium && (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  )}
                </CardFooter>
              </Card>
              <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Premium</CardTitle>
                      <CardDescription>Comprehensive LLM optimization</CardDescription>
                    </div>
                    <div className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                      Recommended
                    </div>
                  </div>
                  <div className="mt-4 text-4xl font-bold">
                    $9<span className="text-lg font-normal text-gray-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Comprehensive website analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Content quality score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Advanced metadata analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Mobile responsiveness check</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Advanced schema analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Content structure analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Detailed recommendations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Weekly monitoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Keyword and Industry based Analysis</span>
                  </div>
                </CardContent>
                <CardFooter>
                  {!isSignedIn && (
                    <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                      <Link href="/login">Sign Up for Premium</Link>
                    </Button>
                  )}
                  {isSignedIn && !isPremium && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleSubscribe}
                      disabled={isLoading}
                    >
                      {isLoading ? "Processing..." : "Upgrade to Premium"}
                    </Button>
                  )}
                  {isSignedIn && isPremium && (
                    <div className="w-full space-y-2">
                      <Button
                        className="w-full"
                        onClick={handleManageSubscription}
                        disabled={isLoading}
                      >
                        {isLoading ? "Loading..." : "Manage Subscription"}
                      </Button>
                      <div className="text-center text-sm text-green-600 font-medium">
                        ✓ Current Plan
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Feature Comparison</h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  See what's included in each plan
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-5xl overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-4 text-left font-medium">Feature</th>
                    <th className="py-4 text-center font-medium">Free</th>
                    <th className="py-4 text-center font-medium">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-4">Website Analysis</td>
                    <td className="py-4 text-center">Basic</td>
                    <td className="py-4 text-center">Comprehensive</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Content Quality Score</td>
                    <td className="py-4 text-center">✓</td>
                    <td className="py-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Metadata Analysis</td>
                    <td className="py-4 text-center">Basic</td>
                    <td className="py-4 text-center">Advanced</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Mobile Responsiveness Check</td>
                    <td className="py-4 text-center">✓</td>
                    <td className="py-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Schema Analysis</td>
                    <td className="py-4 text-center">-</td>
                    <td className="py-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Content Structure Analysis</td>
                    <td className="py-4 text-center">-</td>
                    <td className="py-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Recommendations</td>
                    <td className="py-4 text-center">Basic</td>
                    <td className="py-4 text-center">Detailed</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Weekly Monitoring</td>
                    <td className="py-4 text-center">-</td>
                    <td className="py-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Email Reports</td>
                    <td className="py-4 text-center">-</td>
                    <td className="py-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">Number of URLs</td>
                    <td className="py-4 text-center">3</td>
                    <td className="py-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4">PDF Reports</td>
                    <td className="py-4 text-center">-</td>
                    <td className="py-4 text-center">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Frequently Asked Questions
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Everything you need to know about our service
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What is LLM readiness?</AccordionTrigger>
                  <AccordionContent>
                    LLM readiness refers to how well your website is optimized for Large Language Models like those
                    powering AI search engines and assistants. It includes factors like content quality, metadata,
                    schema markup, and structure that help AI systems understand and properly represent your content.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Why does LLM readiness matter?</AccordionTrigger>
                  <AccordionContent>
                    As AI-powered search becomes more prevalent, websites optimized for LLMs will have better visibility
                    and representation in search results and AI assistants. This can lead to increased traffic, better
                    user engagement, and improved conversion rates.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How often should I check my website's LLM readiness?</AccordionTrigger>
                  <AccordionContent>
                    We recommend checking your website's LLM readiness at least once a month, or after any significant
                    content updates. Premium subscribers receive weekly monitoring to ensure their websites maintain
                    optimal LLM readiness.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Can I cancel my Premium subscription anytime?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can cancel your Premium subscription at any time. Your subscription will remain active
                    until the end of your current billing period, after which it will not renew.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>Do you offer enterprise plans?</AccordionTrigger>
                  <AccordionContent>
                    Yes, we offer custom enterprise plans for businesses with multiple websites or specific
                    requirements. Please contact our sales team for more information.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-blue-600 dark:bg-blue-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center text-white">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to optimize your website for AI?
                </h2>
                <p className="mx-auto max-w-[700px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed text-blue-100">
                  Get started today with our free analysis or upgrade to Premium for comprehensive optimization.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50" asChild>
                  <Link href="/">Try Free Analysis</Link>
                </Button>
                {!isPremium && (
                  isSignedIn ? (
                    <Button
                      size="lg"
                      className="bg-blue-800 text-white hover:bg-blue-700"
                      onClick={handleSubscribe}
                      disabled={isLoading}
                    >
                      {isLoading ? "Processing..." : "Get Premium"}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="bg-blue-800 text-white hover:bg-blue-700"
                      asChild
                    >
                      <Link href="/login">
                        Get Premium
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}