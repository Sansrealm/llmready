import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planId } = await request.json();
        console.log('Creating Clerk subscription for user:', userId, 'Plan:', planId);

        // Create subscription using Clerk's billing API
        const subscription = await clerkClient.subscriptions.createSubscription({
            userId,
            planId,
        });

        console.log('Subscription created:', subscription);

        return NextResponse.json({
            success: true,
            checkoutUrl: subscription.checkoutUrl,
            subscriptionId: subscription.id
        });

    } catch (error) {
        // Fixed: removed ": any" type annotation
        console.error('Error creating Clerk subscription:', error);
        return NextResponse.json(
            { error: 'Failed to create subscription: ' + error.message },
            { status: 500 }
        );
    }
}

// 2. Premium Check Hook
import { useUser } from "@clerk/nextjs";

export function useIsPremium() {
    const { user, isLoaded } = useUser();

    if (!isLoaded || !user) {
        return { isPremium: false, isLoading: !isLoaded };
    }

    // Check if user has any active subscription (since you only have one paid plan)
    const hasActiveSubscription = user.subscriptions?.some(
        sub => sub.status === 'active'
    );

    // Fallback: check metadata for existing users who used your old system
    const hasMetadataPremium = user.publicMetadata?.premiumUser === true;

    const isPremium = hasActiveSubscription || hasMetadataPremium;

    console.log('Premium check:', {
        hasActiveSubscription,
        hasMetadataPremium,
        finalResult: isPremium,
        subscriptions: user.subscriptions,
        metadata: user.publicMetadata
    });

    return {
        isPremium,
        isLoading: false,
        subscriptions: user.subscriptions,
        activeSubscription: user.subscriptions?.find(sub => sub.status === 'active')
    };
}

// 3. Updated Pricing Page
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// Import the premium check hook
function useIsPremium() {
    const { user, isLoaded } = useUser();

    if (!isLoaded || !user) {
        return { isPremium: false, isLoading: !isLoaded };
    }

    const hasActiveSubscription = user.subscriptions?.some(sub => sub.status === 'active');
    const hasMetadataPremium = user.publicMetadata?.premiumUser === true;

    return {
        isPremium: hasActiveSubscription || hasMetadataPremium,
        isLoading: false,
        subscriptions: user.subscriptions
    };
}

export default function PricingPage() {
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const { isPremium, isLoading: premiumLoading } = useIsPremium();

    const handleSubscribe = async () => {
        if (!isSignedIn) {
            router.push('/login');
            return;
        }

        setIsLoading(true);

        try {
            console.log('Starting Clerk subscription process...');

            const response = await fetch("/api/create-clerk-subscription", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    planId: "cplan_2xbZpef4VI02QgZ70DV5g1kiMxx"
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Subscription error:", errorData);
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }

            const data = await response.json();

            if (data.checkoutUrl) {
                console.log('Redirecting to Clerk checkout:', data.checkoutUrl);
                window.location.href = data.checkoutUrl;
            } else {
                console.error("No checkout URL received:", data);
                throw new Error("No checkout URL received");
            }
        } catch (error: any) {
            console.error("Error:", error);
            alert(`Subscription error: ${error.message}. Please try again.`);
            setIsLoading(false);
        }
    };

    const handleManageSubscription = () => {
        // Redirect to Clerk's user profile billing section
        router.push('/user-profile');
    };

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
                                    Test Pricing (Clerk Billing)
                                </h1>
                                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                                    Testing Clerk billing integration with $1 premium plan
                                </p>
                                {/* Premium status indicator */}
                                {isSignedIn && (
                                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg inline-block">
                                        <p className="text-sm">
                                            Current Plan: <span className={`font-medium ${isPremium ? 'text-green-600' : 'text-blue-600'}`}>
                                                {isPremium ? 'Premium ✅' : 'Free'}
                                            </span>
                                        </p>
                                        {user?.subscriptions && user.subscriptions.length > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Subscriptions: {user.subscriptions.length}
                                                {user.subscriptions.map(sub => ` (${sub.status})`)}
                                            </p>
                                        )}
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
                            {/* Free Plan */}
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
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <X className="h-5 w-5 text-gray-300" />
                                        <span>Advanced features</span>
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

                            {/* Premium Plan */}
                            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Premium (Test)</CardTitle>
                                            <CardDescription>Testing Clerk billing</CardDescription>
                                        </div>
                                        <div className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                                            Test Plan
                                        </div>
                                    </div>
                                    <div className="mt-4 text-4xl font-bold">
                                        $1<span className="text-lg font-normal text-gray-500">/month</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span>Everything in Free</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span>Advanced features</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span>Unlimited analyses</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span>Test billing integration</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    {!isSignedIn ? (
                                        <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                                            <Link href="/login">Sign Up for Premium</Link>
                                        </Button>
                                    ) : !isPremium ? (
                                        <Button
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={handleSubscribe}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? "Processing..." : "Test $1 Subscription"}
                                        </Button>
                                    ) : (
                                        <div className="w-full space-y-2">
                                            <Button
                                                className="w-full"
                                                onClick={handleManageSubscription}
                                            >
                                                Manage Subscription
                                            </Button>
                                            <div className="text-center text-sm text-green-600 font-medium">
                                                ✅ Premium Active
                                            </div>
                                        </div>
                                    )}
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}