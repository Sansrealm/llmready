import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@/components/analytics"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LLM Ready Analyzer - Optimize Your Website for AI Search | Free Website Analysis",
  description: "Analyze your website's readiness for Large Language Models and AI-powered search engines. Get instant insights, recommendations, and improve your AI SEO ranking. Free analysis available.",

  openGraph: {
    title: "LLM Ready Analyzer - Optimize Your Website for AI Search",
    description: "Free AI website analysis tool. Check if your website is optimized for Large Language Models and AI search engines like ChatGPT, Claude, and Perplexity.",
    type: "website",
    url: "https://llmcheck.app",
    siteName: "LLM Ready Analyzer",
  },

  twitter: {
    card: "summary_large_image",
    title: "LLM Ready Analyzer - Optimize Your Website for AI Search",
    description: "Free AI website analysis tool. Check if your website is ready for Large Language Models and AI search engines.",
  },

  keywords: [
    "LLM optimization",
    "AI SEO",
    "website AI readiness",
    "Large Language Model SEO",
    "AI search optimization",
    "ChatGPT SEO",
    "semantic SEO",
    "AI website analysis"
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
} // ← Added missing closing brace and removed the comma

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Google Tag Manager */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=G-8VL38BB1K6`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-8VL38BB1K6', {
      page_path: window.location.pathname,
    });
  `}
          </Script>


        </head>
        <body className={`${inter.className} bg-background text-foreground`}>
          {/* Google Tag Manager (noscript) */}
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=G-8VL38BB1K6"
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Analytics />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}