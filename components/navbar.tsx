"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton, SignInButton, SignUpButton, useUser } from "@clerk/nextjs"

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