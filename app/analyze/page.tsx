"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"

export default function AnalyzePage() {
    const [url, setUrl] = useState("")
    const [industry, setIndustry] = useState("")
    const router = useRouter()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return

        const params = new URLSearchParams()
        params.append("url", url)
        if (industry) params.append("industry", industry)

        router.push(`/results?${params.toString()}`)
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-xl space-y-6">
                    <h1 className="text-3xl font-bold text-center">Analyze Your Website</h1>
                    <p className="text-center text-muted-foreground">
                        Enter your website to get your LLM Readiness Score
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                        <Input
                            type="text"
                            placeholder="Industry (optional)"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                        />
                        <Button type="submit" className="w-full">
                            Run Analysis
                        </Button>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    )
}