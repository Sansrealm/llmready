"use client"

import { UserProfile, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

export default function ProfilePage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login")
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container px-4 py-8 md:px-6 md:py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="flex justify-center">
            <UserProfile
              appearance={{
                elements: {
                  card: "shadow-lg",
                  navbar: "hidden",
                  navbarMobileMenuButton: "hidden",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden"
                }
              }}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}