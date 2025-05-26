"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useAuth, useUser } from "@clerk/nextjs";

// Import Clerk's PricingTable component
import { PricingTable } from "@clerk/nextjs";

// Fixed premium check hook that works with Clerk's TypeScript types
// Replace the useIsPremium function in your pricing page with this:

// Updated premium check that uses Clerk's actual subscription methods
// Replace the useIsPremium function with this:

function useIsPremium() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return { isPremium: false, isLoading: !isLoaded };
  }

  console.log('🔍 Checking premium status for user:', user.id);
  console.log('📋 All user properties:', Object.keys(user));

  // Check if user object has subscription-related properties
  const userAny = user as any; // Type assertion to access potential subscription properties

  console.log('🔍 Checking for subscription properties...');
  console.log('- subscriptions:', userAny.subscriptions);
  console.log('- hasSubscription:', userAny.hasSubscription);
  console.log('- activeSubscriptions:', userAny.activeSubscriptions);
  console.log('- subscription:', userAny.subscription);

  // Method 1: Check various possible subscription properties
  const hasActiveSubscription = userAny.subscriptions?.some((sub: any) => sub.status === 'active') ||
    userAny.activeSubscriptions?.length > 0 ||
    userAny.hasSubscription === true ||
    userAny.subscription?.status === 'active';

  // Method 2: Check legacy metadata
  const hasMetadataPremium = user.publicMetadata?.premiumUser === true;

  // Method 3: Since we see "Active" in the UI, let's try to detect it by checking if we can find subscription info
  // Check if the user object has any properties that might indicate subscription status
  const subscriptionProperties = Object.keys(userAny).filter(key =>
    key.toLowerCase().includes('subscription') ||
    key.toLowerCase().includes('billing') ||
    key.toLowerCase().includes('plan')
  );

  console.log('📋 Found subscription-related properties:', subscriptionProperties);

  const isPremium = hasActiveSubscription || hasMetadataPremium;

  console.log('✅ Premium check results:', {
    hasActiveSubscription,
    hasMetadataPremium,
    subscriptionProperties,
    finalResult: isPremium
  });

  return {
    isPremium,
    isLoading: false,
    metadata: user.publicMetadata,
    debug: {
      hasActiveSubscription,
      hasMetadataPremium,
      subscriptionProperties,
      userKeys: Object.keys(user)
    }
  };
}

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const { isPremium, isLoading: premiumLoading } = useIsPremium();

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


        // Enhanced debug component to see more user properties
        // Replace the existing debug component with this:

        {isSignedIn && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left text-xs">
            <h3 className="font-bold mb-2">🔍 Enhanced Debug Info:</h3>
            <div className="space-y-2">
              <div><strong>User ID:</strong> {user?.id}</div>
              <div><strong>Email:</strong> {user?.emailAddresses?.[0]?.emailAddress}</div>

              <div className="mt-2">
                <strong>Public Metadata:</strong>
                <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(user?.publicMetadata, null, 2)}
                </pre>
              </div>

              <div className="mt-2">
                <strong>Subscription Properties Check:</strong>
                <div className="text-xs space-y-1">
                  <div>• subscriptions: {JSON.stringify((user as any)?.subscriptions)}</div>
                  <div>• hasSubscription: {JSON.stringify((user as any)?.hasSubscription)}</div>
                  <div>• activeSubscriptions: {JSON.stringify((user as any)?.activeSubscriptions)}</div>
                  <div>• subscription: {JSON.stringify((user as any)?.subscription)}</div>
                </div>
              </div>

              <div className="mt-2">
                <strong>All User Properties:</strong>
                <div className="text-xs text-gray-600 max-h-20 overflow-auto">
                  {user ? Object.keys(user).join(', ') : 'No user'}
                </div>
              </div>

              <div className="mt-2">
                <strong>Subscription-related Properties:</strong>
                <div className="text-xs text-blue-600">
                  {user ? Object.keys(user as any).filter(key =>
                    key.toLowerCase().includes('subscription') ||
                    key.toLowerCase().includes('billing') ||
                    key.toLowerCase().includes('plan')
                  ).join(', ') || 'None found' : 'No user'}
                </div>
              </div>
            </div>
          </div>
        )}

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
                  // This will automatically handle all billing with your Clerk plans
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