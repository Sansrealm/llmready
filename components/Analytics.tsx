// components/analytics.tsx
"use client"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function Analytics() {
    const pathname = usePathname()

    useEffect(() => {
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("config", "G-8VL38BB1K6", {
                page_path: pathname,
            })
        }
    }, [pathname])

    return null
}