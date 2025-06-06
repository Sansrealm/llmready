//pricing page
"use client";

import { useState, useEffect } from "react"; // Added useEffect import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useAuth, useUser } from "@clerk/nextjs";

// Import Clerk's PricingTable component
import { PricingTable } from "@clerk/nextjs";

// Updated premium check that uses server-side API
function useIsPremium() {
  const { user, isLoaded } = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debug, setDebug] = useState<any>({});

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
    refresh: () => {
      if (user) {
        setIsLoading(true);
        // Re-run the effect by updating a dependency
        window.location.reload();
      }
    }
  };
}


export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const { isPremium, isLoading: premiumLoading, debug } = useIsPremium();

  if (premiumLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-blue-50 dark:from-gray-950 dark:to-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Simple, Transparent Pricing
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Choose the plan that fits your needs. No hidden fees or surprises.
                </p>
                {/* Premium status indicator */}
                {isSignedIn && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg inline-block">
                    <p className="text-sm">
                      Current Plan: <span className={`font-medium ${isPremium ? 'text-green-600' : 'text-blue-600'}`}>
                        {isPremium ? 'Premium ✅' : 'Free'}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>



        {/* Clerk Pricing Table */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              {isSignedIn ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Choose Your Plan</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Upgrade to Premium for advanced LLM optimization features
                    </p>
                  </div>

                  {/* Clerk's built-in PricingTable component */}
                  <PricingTable

                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-4">Sign In to View Plans</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Please sign in to access our subscription plans
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature Comparison - Keep your existing comparison table */}
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
                    Yes, you can cancel your Premium subscription at any time through your account settings. Your subscription will remain active
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
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-blue-600 hover:bg-blue-50 h-11 px-8"
                >
                  Try Free Analysis
                </Link>
                {!isSignedIn && (
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-800 text-white hover:bg-blue-700 h-11 px-8"
                  >
                    Get Premium
                  </Link>
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