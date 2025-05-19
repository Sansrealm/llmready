"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { auth, signInWithEmail, signUpWithEmail, signInWithGithub } from "@/lib/firebase"

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const email = (document.getElementById("email") as HTMLInputElement)?.value
    const password = (document.getElementById("password") as HTMLInputElement)?.value

    const { user, error } = await signInWithEmail(email, password)
    setIsLoading(false)

    if (user) {
      router.push("/analyze")
    } else {
      alert(error)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const email = (document.getElementById("signup-email") as HTMLInputElement)?.value
    const password = (document.getElementById("signup-password") as HTMLInputElement)?.value
    const confirmPassword = (document.getElementById("confirm-password") as HTMLInputElement)?.value

    if (password !== confirmPassword) {
      setIsLoading(false)
      alert("Passwords do not match")
      return
    }

    const { user, error } = await signUpWithEmail(email, password)
    setIsLoading(false)

    if (user) {
      router.push("/analyze")
    } else {
      alert(error)
    }
  }

  const handleGitHubLogin = async () => {
    setIsLoading(true)
    const { user, error } = await signInWithGithub()
    setIsLoading(false)

    if (user) {
      router.push("/analyze")
    } else {
      alert(error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-md space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold">Welcome to LLM Ready Analyzer</h1>
              <p className="text-gray-500 dark:text-gray-400">Sign in to your account or create a new one</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Enter your credentials to access your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="name@example.com" required />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                            Forgot password?
                          </Link>
                        </div>
                        <Input id="password" type="password" required />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </CardContent>
                  <CardFooter className="flex flex-col">
                    <div className="relative my-4 w-full">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline">Google</Button>
                      <Button variant="outline" onClick={handleGitHubLogin} disabled={isLoading}>
                        {isLoading ? "Loading..." : "GitHub"}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="signup">
                <Card>
                  <CardHeader>
                    <CardTitle>Sign Up</CardTitle>
                    <CardDescription>Create a new account to get started</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first-name">First name</Label>
                          <Input id="first-name" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last-name">Last name</Label>
                          <Input id="last-name" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input id="signup-email" type="email" placeholder="name@example.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input id="signup-password" type="password" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input id="confirm-password" type="password" required />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </CardContent>
                  <CardFooter className="flex flex-col">
                    <div className="relative my-4 w-full">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline">Google</Button>
                      <Button variant="outline" onClick={handleGitHubLogin} disabled={isLoading}>
                        {isLoading ? "Loading..." : "GitHub"}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
