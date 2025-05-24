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

    useEffect(() => {
        // Redirect to home if not signed in
        if (isLoaded && !isSignedIn) {
            router.push('/');
            return;
        }

        const fetchSessionDetails = async () => {
            try {
                // In a real implementation, you would verify the session with Stripe
                // For now, we'll just set a success message
                setSessionDetails({
                    status: 'success',
                    subscription: {
                        plan: 'Premium',
                        price: '$9/month'
                    }
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
                            <div className="text-center py-8">Loading subscription details...</div>
                        ) : error ? (
                            <div className="text-center text-red-500 py-8">{error}</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                                    <div className="text-green-600 dark:text-green-400 text-lg font-medium mb-2">
                                        Your premium subscription is now active!
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        You now have access to all premium features including unlimited website analyses,
                                        detailed recommendations, PDF reports, and more.
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
                                            <span className="text-green-600 font-medium">Active</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button className="w-full" asChild>
                            <Link href="/">Analyze a Website</Link>
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/pricing">Manage Subscription</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
