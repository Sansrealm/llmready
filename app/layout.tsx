import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@/components/Analytics"
import { ThemeToggle } from "@/components/theme-toggle"
import { QueryProvider } from "./providers/query-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL('https://llmcheck.app'),
  title: "LLM Check — AI Visibility & LLM Readiness Audit",
  description: "Find out if ChatGPT, Gemini, and Perplexity recommend your brand. Free AI visibility scan — instant results, no signup required.",

  openGraph: {
    title: "Does ChatGPT recommend your brand?",
    description: "Scan ChatGPT, Gemini, and Perplexity to see if they cite you — or your competitors. Free AI visibility audit at llmcheck.app.",
    type: "website",
    url: "https://llmcheck.app",
    siteName: "LLM Check",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "LLM Check — AI Visibility Scan for ChatGPT, Gemini, and Perplexity",
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "Does ChatGPT recommend your brand?",
    description: "Scan ChatGPT, Gemini, and Perplexity to see if they cite you — or your competitors. Free at llmcheck.app.",
    images: ["/og"],
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
}

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

          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5740140678935322"
            crossOrigin="anonymous"></script>

          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="shortcut icon" href="/favicon.ico" />
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
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              <Analytics />
              {children}
              <ThemeToggle />
            </ThemeProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}