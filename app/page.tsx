// ✅ FINAL MERGED app/page.tsx — Guest Limit + Login Resume + Turnstile
"use client";

import { useState, useEffect } from "react";
import Turnstile from "react-turnstile";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Globe,
  Search,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/lib/firebase";

export default function Home() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const router = useRouter();

  // Resume from sessionStorage if redirected after login
  useEffect(() => {
    const pendingUrl = sessionStorage.getItem("pendingURL");
    if (pendingUrl) {
      const pendingIndustry = sessionStorage.getItem("pendingIndustry") || "";
      const pendingEmail = sessionStorage.getItem("pendingEmail") || "";
      sessionStorage.removeItem("pendingURL");
      sessionStorage.removeItem("pendingIndustry");
      sessionStorage.removeItem("pendingEmail");
      router.push(
        `/results?url=${encodeURIComponent(pendingUrl)}&email=${encodeURIComponent(pendingEmail)}&industry=${encodeURIComponent(pendingIndustry)}&turnstileToken=dummy`
      );
    }
  }, [router]);

  // Load guest usage count from localStorage
  useEffect(() => {
    const storedCount = localStorage.getItem("guestAnalysisCount");
    if (storedCount) {
      setAnalysisCount(parseInt(storedCount, 10));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return alert("Please enter a valid URL");
    if (!turnstileToken) return alert("Please complete the CAPTCHA challenge");

    let processedUrl = url.trim();
    try {
      new URL(processedUrl);
    } catch {
      processedUrl = "https://" + processedUrl;
    }

    const user = auth.currentUser;
    if (!user) {
      if (analysisCount >= 1) {
        setShowLoginAlert(true);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
        return;
      }
      // Save input for post-login resume
      sessionStorage.setItem("pendingURL", processedUrl);
      sessionStorage.setItem("pendingIndustry", industry);
      sessionStorage.setItem("pendingEmail", email);

      // Increment localStorage count
      const newCount = analysisCount + 1;
      setAnalysisCount(newCount);
      localStorage.setItem("guestAnalysisCount", newCount.toString());
    }

    setIsSubmitting(true);
    try {
      router.push(
        `/results?url=${encodeURIComponent(processedUrl)}&email=${encodeURIComponent(email)}&industry=${encodeURIComponent(industry)}&turnstileToken=${encodeURIComponent(turnstileToken)}`
      );
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Login Alert */}
        {showLoginAlert && (
          <div className="container px-4 md:px-6 mt-4">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Free analysis limit reached</AlertTitle>
              <AlertDescription>
                You've reached the limit for free website analyses. Please log in or create an account to continue.
                <div className="mt-2">
                  <Button onClick={handleLoginRedirect} variant="outline" className="mr-2">
                    Log in
                  </Button>
                  <Button onClick={() => router.push('/login?tab=signup')}>
                    Create account
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-blue-50 dark:from-gray-950 dark:to-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Is Your Website <span className="text-green-600 dark:text-green-500">LLM Ready</span>?
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Analyze your website's readiness for Large Language Models and improve your visibility in AI-powered search.
                </p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Enter your website URL"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                    />
                    <Turnstile
                      sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                      onVerify={(token) => setTurnstileToken(token)}
                      theme="auto"
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="email"
                      placeholder="Email (optional)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="saas">SaaS</SelectItem>
                        <SelectItem value="media">Media & Publishing</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {analysisCount === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Free users can analyze 1 website. Create an account for unlimited analyses.
                    </p>
                  )}
                  <Button type="submit" disabled={isSubmitting || (auth.currentUser === null && analysisCount >= 1)} className="w-full">
                    {isSubmitting ? "Analyzing..." : (auth.currentUser === null && analysisCount >= 1) ? "Analysis Limit Reached" : "Analyze"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
