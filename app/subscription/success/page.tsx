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
    const [sessionDetails, setSessionDetails] = useState<any>(null);
    const [isPremiumState, setIsPremiumState] = useState(false);

    // Function to refresh session
    const refreshSession = async () => {
        if (!isSignedIn) return false;

        try {
            const response = await fetch('/api/refresh-session');
            if (response.ok) {
                const data = await response.json();
                setIsPremiumState(data.isPremium);
                return data.isPremium;
            }
            return false;
        } catch (error) {
            console.error('Error refreshing session:', error);
            return false;
        }
    };

    useEffect(() => {
        // Redirect to home if not signed in
        if (isLoaded && !isSignedIn) {
            router.push('/');
            return;
        }

        const fetchSessionDetails = async () => {
            try {
                // Refresh session multiple times with delay to account for webhook processing
                const refreshWithRetry = async () => {
                    let isPremium = false;

                    // Try up to 5 times with 3-second intervals
                    for (let i = 0; i < 5; i++) {
                        console.log(`Attempting session refresh ${i + 1}/5...`);

                        if (i > 0) {
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }

                        isPremium = await refreshSession();

                        if (isPremium) {
                            console.log('Premium status confirmed!');
                            break;
                        }
                    }

                    return isPremium;
                };

                const isPremium = await refreshWithRetry();

                // Set session details
                setSessionDetails({
                    status: 'success',
                    subscription: {
                        plan: 'Premium',
                        price: '$9/month'
                    },
                    isPremium
                });

                setLoading(false);
            } catch (err: any) {
                console.error("Error fetching session details:", err);
                setError(err.message || "Failed to verify subscription");
                setLoading(false);
            }
        };

        if (isSignedIn) {
            fetchSessionDetails();
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
                                    <p className="text-sm text-gray-500">This may take a few moments</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-500 py-8">
                                <p className="mb-4">{error}</p>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.reload()}
                                    size="sm"
                                >
                                    Try Again
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
                                onClick={() => window.location.reload()}
                                className="w-full text-sm"
                            >
                                Refresh Page
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </main>
            <Footer />
        </div>
    );
}