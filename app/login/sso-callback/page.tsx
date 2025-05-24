"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SSOCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const redirectUrl = searchParams.get("redirect_url");
        if (redirectUrl) {
            router.push(redirectUrl);
        } else {
            router.push("/");
        }
    }, [router, searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p className="text-lg">Redirecting after authentication...</p>
        </div>
    );
}
