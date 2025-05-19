// src/app/analyze/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AnalyzePage() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to homepage where the analysis form lives
        router.push("/")
    }, [router])

    return (
        <div className="flex h-screen items-center justify-center text-gray-500">
            Redirecting to homepage...
        </div>
    )
}