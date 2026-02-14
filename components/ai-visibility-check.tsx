"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, XCircle, Bell, ArrowRight } from "lucide-react";
import { getPromptsForIndustry } from "@/lib/ai-visibility-prompts";
import { trackEvent } from "@/lib/track-event";
import Link from "next/link";

interface AiVisibilityCheckProps {
  url: string;
  industry: string | null;
  isSignedIn: boolean;
  isPremium: boolean;
  userEmail: string | null;
  userId: string | null;
}

export default function AiVisibilityCheck({
  url,
  industry,
  isSignedIn,
  isPremium,
  userEmail,
  userId,
}: AiVisibilityCheckProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  const prompts = getPromptsForIndustry(industry);

  // Extract domain from URL for display
  let domain = url;
  try {
    domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    // keep original url as domain
  }

  // Track when section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true;
          trackEvent("ai_visibility_viewed", {
            industry: industry || "other",
            url,
          });
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [industry, url]);

  const handleSubmit = async () => {
    const submitEmail = isSignedIn ? userEmail : email;
    if (!submitEmail) return;

    setSubmitting(true);
    setError(null);

    trackEvent("ai_visibility_cta_click", {
      industry: industry || "other",
      auth_state: isSignedIn ? (isPremium ? "premium" : "free") : "guest",
    });

    try {
      const res = await fetch("/api/visibility-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: submitEmail,
          url,
          industry: industry || "other",
          userId: userId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      trackEvent("ai_visibility_email_submit", {
        industry: industry || "other",
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={sectionRef} className="bg-white dark:bg-gray-950 rounded-lg border p-6">
      {/* Part A: Simulated Prompt Results */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Search className="h-6 w-6 text-blue-600" />
          AI Visibility Check
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          How does your site show up in AI-generated answers?
        </p>

        <div className="space-y-3">
          {prompts.map((prompt, i) => (
            <Card
              key={i}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  &ldquo;{prompt}&rdquo;
                </p>
              </div>
              <Badge
                variant="destructive"
                className="ml-3 shrink-0 flex items-center gap-1"
              >
                <XCircle className="h-3 w-3" />
                Not Found
              </Badge>
            </Card>
          ))}
        </div>

        <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">
          Your domain ({domain}) does NOT appear in common AI prompts for your industry.
        </p>
      </div>

      {/* Part B: Interest CTA */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-1">
          Track your AI visibility across models — coming soon.
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Monitor how ChatGPT, Gemini, Perplexity, and Claude mention your brand.
          Get alerts when your visibility changes.
        </p>

        {submitted ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-md p-3">
            <Bell className="h-5 w-5" />
            <span className="text-sm font-medium">
              You&apos;re on the list! We&apos;ll notify you when AI Visibility Tracking launches.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {!isSignedIn ? (
              /* Guest: email input + notify button */
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="max-w-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !email}
                >
                  {submitting ? "Saving..." : "Notify Me"}
                </Button>
              </div>
            ) : (
              /* Signed in: auto-capture email */
              <div className="flex items-center gap-3">
                <Button onClick={handleSubmit} disabled={submitting}>
                  <Bell className="h-4 w-4 mr-2" />
                  {submitting ? "Saving..." : "Notify Me"}
                </Button>
                {!isPremium && (
                  <Link
                    href="/pricing"
                    onClick={() => {
                      trackEvent("ai_visibility_upgrade_click", {
                        industry: industry || "other",
                      });
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    Upgrade to Premium
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
