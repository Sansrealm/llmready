"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User } from "lucide-react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"


export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await auth.signOut()
    setUser(null)
    setIsOpen(false)
    if (pathname.startsWith("/profile")) {
      window.location.href = "/"
    }
  }

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

        <nav className="hidden md:flex md:gap-6">
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
        </nav>

        <div className="hidden md:flex md:items-center md:gap-4">
          {!loading && user ? (
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="flex items-center gap-2" asChild>
                <Link href="/profile">
                  <User className="h-4 w-4" />
                  <span>{user.displayName || user.email || "My Account"}</span>
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            !loading && (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/login?tab=signup">Sign Up</Link>
                </Button>
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
              </nav>

              <div className="flex flex-col gap-2 pt-6">
                {!loading && user ? (
                  <>
                    <Button asChild onClick={() => setIsOpen(false)}>
                      <Link href="/profile">My Account</Link>
                    </Button>
                    <Button variant="outline" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  !loading && (
                    <>
                      <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                        <Link href="/login">Login</Link>
                      </Button>
                      <Button asChild onClick={() => setIsOpen(false)}>
                        <Link href="/login?tab=signup">Sign Up</Link>
                      </Button>
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