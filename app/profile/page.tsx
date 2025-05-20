"use client"

import type React from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bell, CreditCard, LogOut, Settings, User, AlertCircle, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const router = useRouter()

  // Load user data from localStorage on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          name: firebaseUser.displayName || firebaseUser.email || "User",
          email: firebaseUser.email || "",
          accountType: "free", // default unless you're syncing from Firestore
        }
        setUserData(userData)
      } else {
        router.push("/login?returnUrl=/profile")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Get form data
    const formData = new FormData(e.target as HTMLFormElement)
    const firstName = formData.get("first-name") as string
    const lastName = formData.get("last-name") as string
    const email = formData.get("email") as string
    const company = formData.get("company") as string
    const website = formData.get("website") as string

    // Update user data in localStorage
    setTimeout(() => {
      if (userData) {
        const updatedUser = {
          ...userData,
          name: `${firstName} ${lastName}`,
          email: email,
          company: company,
          website: website,
        }

        localStorage.setItem("user", JSON.stringify(updatedUser))
        setUserData(updatedUser)
      }

      setIsLoading(false)
    }, 1000)
  }

  const handleUpgradeSubscription = () => {
    router.push("/pricing?from=profile")
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name.split(" ").map(n => n[0]).join("").toUpperCase()
  }

  if (!userData) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p>Loading profile...</p>
        </main>
        <Footer />
      </div>
    )
  }

  const isFreeAccount = userData.accountType === "free"

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container px-4 py-8 md:px-6 md:py-12">
          <div className="mb-8 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/placeholder-user.jpg" alt={userData.name} />
              <AvatarFallback>{getInitials(userData.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{userData.name}</h1>
              <div className="flex items-center gap-2">
                <p className="text-gray-500 dark:text-gray-400">{userData.email}</p>
                <Badge className={isFreeAccount ? "bg-blue-600" : "bg-green-600"}>
                  {isFreeAccount ? "Free" : "Premium"}
                </Badge>
              </div>
            </div>
          </div>

          {isFreeAccount && (
            <Alert className="mb-6 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Free Account</AlertTitle>
              <AlertDescription>
                You're currently on a free account with limited features. Upgrade to Premium for unlimited website analyses and advanced insights.
                <div className="mt-2">
                  <Button onClick={handleUpgradeSubscription} className="bg-blue-600 hover:bg-blue-700">
                    Upgrade to Premium
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4 md:w-auto">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Subscription</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First name</Label>
                        <Input
                          id="first-name"
                          name="first-name"
                          defaultValue={userData.name ? userData.name.split(" ")[0] : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last name</Label>
                        <Input
                          id="last-name"
                          name="last-name"
                          defaultValue={userData.name ? userData.name.split(" ").slice(1).join(" ") : ""}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={userData.email}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company (Optional)</Label>
                      <Input
                        id="company"
                        name="company"
                        defaultValue={userData.company || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website (Optional)</Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        defaultValue={userData.website || ""}
                      />
                    </div>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Manage your subscription plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{isFreeAccount ? "Free Plan" : "Premium Plan"}</h3>
                          <p className="text-sm text-gray-500">{isFreeAccount ? "Limited features" : "$29/month"}</p>
                        </div>
                        <Badge>{isFreeAccount ? "Active" : "Active"}</Badge>
                      </div>
                      <div className="mt-4">
                        {isFreeAccount ? (
                          <div className="space-y-2">
                            <p className="text-sm">Features included:</p>
                            <ul className="text-sm list-disc pl-5 space-y-1">
                              <li>1 website analysis</li>
                              <li>Basic LLM readiness score</li>
                              <li>Limited recommendations</li>
                            </ul>
                            <Button
                              onClick={handleUpgradeSubscription}
                              className="mt-2 w-full md:w-auto"
                            >
                              Upgrade to Premium
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm">Next billing date: June 15, 2023</p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">Features included:</p>
                              <ul className="text-sm list-disc pl-5 space-y-1">
                                <li>Unlimited website analyses</li>
                                <li>Advanced LLM readiness metrics</li>
                                <li>Detailed recommendations</li>
                                <li>Priority support</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isFreeAccount && (
                      <>
                        <div className="rounded-lg border p-4">
                          <h3 className="font-semibold">Payment Method</h3>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="rounded bg-gray-100 p-2 dark:bg-gray-800">
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Visa ending in 4242</p>
                              <p className="text-xs text-gray-500">Expires 12/2025</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button variant="outline">Update Payment Method</Button>
                          <Button
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                          >
                            Cancel Subscription
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {!isFreeAccount && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View your past invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">May 15, 2023</p>
                            <p className="text-sm text-gray-500">Premium Plan - Monthly</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">$29.00</p>
                            <Button variant="link" className="h-auto p-0 text-sm">
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">April 15, 2023</p>
                            <p className="text-sm text-gray-500">Premium Plan - Monthly</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">$29.00</p>
                            <Button variant="link" className="h-auto p-0 text-sm">
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Manage how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Weekly Reports</p>
                        <p className="text-sm text-gray-500">Receive weekly LLM readiness reports</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="weekly-reports" className="sr-only">
                          Toggle
                        </Label>
                        <input
                          type="checkbox"
                          id="weekly-reports"
                          className="h-4 w-4 rounded border-gray-300"
                          defaultChecked
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Score Changes</p>
                        <p className="text-sm text-gray-500">Get notified when your LLM readiness score changes</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="score-changes" className="sr-only">
                          Toggle
                        </Label>
                        <input
                          type="checkbox"
                          id="score-changes"
                          className="h-4 w-4 rounded border-gray-300"
                          defaultChecked
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Product Updates</p>
                        <p className="text-sm text-gray-500">Learn about new features and improvements</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="product-updates" className="sr-only">
                          Toggle
                        </Label>
                        <input
                          type="checkbox"
                          id="product-updates"
                          className="h-4 w-4 rounded border-gray-300"
                          defaultChecked
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Preferences</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account settings and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      className="w-full rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      className="w-full rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option value="utc">UTC</option>
                      <option value="est">Eastern Time (ET)</option>
                      <option value="cst">Central Time (CT)</option>
                      <option value="pst">Pacific Time (PT)</option>
                      <option value="gmt">Greenwich Mean Time (GMT)</option>
                    </select>
                  </div>
                  <Button>Save Settings</Button>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-red-200 p-4 dark:border-red-900">
                    <h3 className="font-semibold text-red-600 dark:text-red-400">Delete Account</h3>
                    <p className="mt-1 text-sm">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}