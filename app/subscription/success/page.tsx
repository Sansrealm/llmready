"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";

export default function SubscriptionSuccessPage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionDetails, setSessionDetails] = useState<Record<string, unknown> | null>(null);
    const [isPremiumState, setIsPremiumState] = useState(false);
    const [refreshing, setRefreshing] = useState(false); // Added missing state

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

    // Manual refresh function for button click
    const handleManualRefresh = async () => {
        setLoading(true);
        setError(null);

        try {
            const success = await refreshSession(3);

            if (success) {
                setSessionDetails({
                    status: 'success',
                    subscription: { plan: 'Premium', price: '$9/month' },
                    isPremium: true
                });
            } else {
                setSessionDetails({
                    status: 'processing',
                    subscription: { plan: 'Premium', price: '$9/month' },
                    isPremium: false
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to refresh status');
        } finally {
            setLoading(false);
        }
    };

    // Enhanced success page logic
    useEffect(() => {
        // Redirect to home if not signed in
        if (isLoaded && !isSignedIn) {
            router.push('/');
            return;
        }

        if (isSignedIn) {
            const handleSubscriptionSuccess = async () => {
                console.log('Starting subscription success flow...');

                // Wait a bit for webhook to process
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Try to refresh with more attempts for subscription success
                const success = await refreshSession(8); // Try up to 8 times

                if (success) {
                    console.log('Premium subscription confirmed!');
                    setSessionDetails({
                        status: 'success',
                        subscription: { plan: 'Premium', price: '$9/month' },
                        isPremium: true
                    });
                } else {
                    console.log('Premium status not yet active, but payment was processed');
                    setSessionDetails({
                        status: 'processing',
                        subscription: { plan: 'Premium', price: '$9/month' },
                        isPremium: false
                    });
                }

                setLoading(false);
            };

            handleSubscriptionSuccess();
        }
    }, [isLoaded, isSignedIn, router]);

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Subscription Successful!</CardTitle>
                        <CardDescription className="text-center">
                            Thank you for subscribing to LLM Ready Analyzer Premium
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="space-y-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                                    <p>Activating your premium subscription...</p>
                                    <p className="text-sm text-gray-500">
                                        {refreshing ? 'Checking status...' : 'This may take a few moments'}
                                    </p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-500 py-8">
                                <p className="mb-4">{error}</p>
                                <Button
                                    variant="outline"
                                    onClick={handleManualRefresh}
                                    size="sm"
                                    disabled={refreshing}
                                >
                                    {refreshing ? 'Checking...' : 'Try Again'}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className={`${isPremiumState ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'} p-4 rounded-lg text-center`}>
                                    <div className={`${isPremiumState ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} text-lg font-medium mb-2`}>
                                        {isPremiumState
                                            ? 'Your premium subscription is now active!'
                                            : 'Payment received! Activating your premium subscription...'
                                        }
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {isPremiumState
                                            ? 'You now have access to all premium features including unlimited website analyses, detailed recommendations, PDF reports, and more.'
                                            : 'Your premium subscription is being activated. This usually takes a few minutes. You can start using premium features once activation is complete.'
                                        }
                                    </p>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-medium mb-2">Subscription Details:</h3>
                                    <ul className="space-y-2">
                                        <li className="flex justify-between">
                                            <span>Plan:</span>
                                            <span className="font-medium">Premium</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span>Price:</span>
                                            <span className="font-medium">$9/month</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span>Status:</span>
                                            <span className={`font-medium ${isPremiumState ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {isPremiumState ? 'Active' : 'Activating...'}
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {!isPremiumState && (
                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            <strong>Note:</strong> If your premium status doesn't update automatically,
                                            you can refresh the page or visit the pricing page and click "Refresh Status".
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button className="w-full" asChild>
                            <Link href="/">Analyze a Website</Link>
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/pricing">View Premium Features</Link>
                        </Button>
                        {!isPremiumState && !loading && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleManualRefresh}
                                disabled={refreshing}
                                className="w-full text-sm"
                            >
                                {refreshing ? 'Checking Status...' : 'Check Status Again'}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </main>
            <Footer />
        </div>
    );
}