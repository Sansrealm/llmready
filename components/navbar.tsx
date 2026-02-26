"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, ChevronDown, ExternalLink } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { UserButton, SignInButton, SignUpButton, useUser } from "@clerk/nextjs"
import type { AnalyzedUrlSummary } from "@/lib/types"

// Score badge color thresholds
function scoreBadgeClass(score: number): string {
  if (score >= 70) return "bg-green-100 text-green-700"
  if (score >= 40) return "bg-amber-100 text-amber-700"
  return "bg-red-100 text-red-700"
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

// The dropdown content — lazy fetched once on first open
function MyAnalysisDropdown() {
  const router = useRouter()
  const [fetched, setFetched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analyses, setAnalyses] = useState<AnalyzedUrlSummary[] | null>(null)
  const [isUpgrade, setIsUpgrade] = useState(false)

  const onOpen = useCallback(
    async (open: boolean) => {
      if (!open || fetched) return
      setFetched(true)
      setLoading(true)
      try {
        const res = await fetch("/api/my-analyses")
        if (res.status === 403) {
          setIsUpgrade(true)
        } else if (res.ok) {
          const data = await res.json()
          setAnalyses(data.analyses)
        }
      } catch {
        // silently fail — don't break navbar
      } finally {
        setLoading(false)
      }
    },
    [fetched]
  )

  const displayed = analyses?.slice(0, 10) ?? []

  return (
    <DropdownMenu onOpenChange={onOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50">
          My Analysis
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {loading && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="h-6 w-9 animate-pulse rounded bg-gray-200" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && isUpgrade && (
          <div className="px-3 py-3 text-center">
            <p className="mb-1 text-sm font-medium text-gray-800">
              Unlock analysis history
            </p>
            <p className="mb-3 text-xs text-gray-500">
              Premium keeps every analysis so you can track progress over time.
            </p>
            <Link href="/pricing">
              <Button size="sm" className="w-full">
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        )}

        {!loading && !isUpgrade && analyses !== null && analyses.length === 0 && (
          <div className="px-3 py-3 text-center text-sm text-gray-500">
            No analyses yet.{" "}
            <Link href="/" className="text-blue-600 hover:underline">
              Analyze a site
            </Link>
          </div>
        )}

        {!loading && !isUpgrade && displayed.length > 0 && (
          <>
            {displayed.map((item) => (
              <DropdownMenuItem
                key={item.normalizedUrl}
                className="cursor-pointer px-3 py-2"
                onClick={() =>
                  router.push(`/results?url=${encodeURIComponent(item.url)}`)
                }
              >
                <div className="flex w-full items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${scoreBadgeClass(item.latestScore)}`}
                  >
                    {item.latestScore}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {getDomain(item.url)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {relativeDate(item.analyzedAt)}
                      {item.analysisCount > 1 &&
                        ` · ${item.analysisCount} scans`}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                </div>
              </DropdownMenuItem>
            ))}
            {analyses && analyses.length > 10 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="justify-center text-xs text-blue-600">
                  <Link href="/">View all analyses</Link>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { isLoaded, isSignedIn } = useUser()
  const pathname = usePathname()

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Pricing", href: "/pricing" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm dark:bg-gray-950/80">

      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-green-500 text-white">
              <span className="font-bold">LC</span>
            </div>
            <span className="text-lg font-bold">LLM Check</span>
          </Link>
        </div>

        <nav className="hidden md:flex md:items-center md:gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium ${pathname === item.href
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                }`}
            >
              {item.name}
            </Link>
          ))}
          {isLoaded && isSignedIn && <MyAnalysisDropdown />}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-4">
          {isLoaded && isSignedIn ? (
            <div className="flex items-center gap-4">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8"
                  }
                }}
              />
            </div>
          ) : (
            isLoaded && (
              <>
                <SignInButton mode="modal">
                  <Button variant="ghost">Login</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button>Sign Up</Button>
                </SignUpButton>
              </>
            )
          )}
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col gap-6 pt-6">
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-green-500 text-white">
                  <span className="font-bold">LC</span>
                </div>
                <span className="text-lg font-bold">LLM Check</span>
              </Link>

              <nav className="flex flex-col gap-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`text-lg font-medium ${pathname === item.href
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                      }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                {isLoaded && isSignedIn && (
                  <Link
                    href="/pricing"
                    className="text-lg font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                    onClick={() => setIsOpen(false)}
                  >
                    My Analysis
                  </Link>
                )}
              </nav>

              <div className="flex flex-col gap-2 pt-6">
                {isLoaded && isSignedIn ? (
                  <>
                    <div className="flex justify-center py-2">
                      <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            avatarBox: "h-10 w-10"
                          }
                        }}
                      />
                    </div>
                  </>
                ) : (
                  isLoaded && (
                    <>
                      <SignInButton mode="modal">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                          Login
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button onClick={() => setIsOpen(false)}>
                          Sign Up
                        </Button>
                      </SignUpButton>
                    </>
                  )
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
