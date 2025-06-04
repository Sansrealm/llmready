"use client"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

declare global {
    interface Window {
        gtag: (...args: any[]) => void;
    }
}

export function Analytics() {
    const pathname = usePathname()

    useEffect(() => {
        if (typeof window !== "undefined" && typeof window.gtag === "function") {
            window.gtag("config", "G-8VL38BB1K6", {
                page_path: pathname,
            })
        }
    }, [pathname])

    return null
}