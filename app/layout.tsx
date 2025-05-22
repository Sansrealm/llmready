import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LLM Ready Analyzer - Optimize Your Website for AI",
  description:
    "Analyze your website's readiness for Large Language Models and improve your visibility in AI-powered search.",
  generator: 'v0.dev'
}

import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css"; // Keep your existing imports

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} bg-background text-foreground`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}