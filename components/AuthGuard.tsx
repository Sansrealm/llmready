"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push("/login")
            } else {
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [router])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-gray-500">
                Checking authentication...
            </div>
        )
    }

    return <>{children}</>
}