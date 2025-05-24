"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function SubscriptionSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const sessionId = searchParams.get("session_id");

    useEffect(() => {
        // Verify the session was successful
        if (sessionId) {
            setIsLoading(false);
        } else {
            // If no session ID, redirect to pricing
            router.push("/pricing");
        }
    }, [sessionId, router]);

    return (
        <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12">
            <div className="w-full max-w-md space-y-8 text-center">
                {isLoading ? (
                    <p>Verifying your subscription...</p>
                ) : (
                    <>
                        <div className="flex justify-center">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-bold">Subscription Successful!</h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Thank you for subscribing to our Premium plan. You now have access to all premium features.
                        </p>
                        <div className="flex flex-col gap-4 pt-4">
                            <Button onClick={() => router.push("/")}>
                                Analyze a Website
                            </Button>
                            <Button variant="outline" onClick={() => router.push("/profile")}>
                                View My Account
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
