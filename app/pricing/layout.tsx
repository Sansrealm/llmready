import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — LLM Check | Free & Premium AI Website Analysis Plans",
  description:
    "Start free with 3 AI readiness analyses per month. Upgrade to Premium for unlimited scans, AI visibility checks across ChatGPT and Gemini, analysis history, and PDF reports. From $9/month.",
  keywords: [
    "LLM Check pricing",
    "AI SEO tool pricing",
    "website AI analysis plans",
    "AI visibility scan pricing",
    "LLM readiness tool",
    "premium AI SEO",
  ],
  openGraph: {
    title: "LLM Check Pricing — Free & Premium AI Website Analysis",
    description:
      "Start free with 3 analyses per month. Upgrade to Premium for unlimited AI visibility scans, analysis history, PDF reports, and more.",
    url: "https://llmcheck.app/pricing",
    type: "website",
    images: [{ url: "https://llmcheck.app/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LLM Check Pricing — Free & Premium Plans",
    description:
      "Free plan includes 3 analyses/month. Premium unlocks unlimited scans, AI visibility checks, history, and PDF reports.",
    images: ["https://llmcheck.app/og-image.png"],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
