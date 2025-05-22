"use client";

import { SignIn } from "@clerk/nextjs";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center py-12">
                <div className="container px-4 md:px-6">
                    <div className="mx-auto max-w-md space-y-6">
                        <div className="space-y-2 text-center">
                            <h1 className="text-3xl font-bold">Welcome Back</h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                Sign in to your account to continue
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <SignIn
                                appearance={{
                                    elements: {
                                        formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                                        card: "shadow-lg",
                                    }
                                }}
                                redirectUrl="/"
                            />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}