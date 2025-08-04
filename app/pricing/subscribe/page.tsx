"use client";

import { useEffect } from "react";
import { PricingTable } from "@clerk/nextjs";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function SubscribePage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 py-12">
                <div className="container px-4 md:px-6">
                    <div className="mx-auto max-w-4xl text-center mb-8">
                        <h1 className="text-2xl font-bold mb-4">Complete Your Subscription</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Choose between monthly or annual billing
                        </p>
                    </div>
                    <PricingTable />
                </div>
            </main>
            <Footer />
        </div>
    );
}