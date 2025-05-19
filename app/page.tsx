// This file combines your original V0 layout with your working form functionality
"use client";

import { useState } from "react";
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
  CheckCircle2,
  ChevronRight,
  Globe,
  Search,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function Home() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!url) return alert("Please enter a valid URL");
    if (!turnstileToken) return alert("Please complete the CAPTCHA challenge");

    let processedUrl = url;
    try {
      const parsed = new URL(processedUrl);
    } catch {
      processedUrl = "https://" + processedUrl;
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
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
                  {/* URL Input + Turnstile */}
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

                  {/* Optional Fields */}
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

                  {/* Submit */}
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Analyzing..." : "Analyze"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Why LLM Ready Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Why LLM Readiness Matters
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  As AI-powered search becomes the norm, optimizing your website for Large Language Models is crucial for visibility and traffic.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Search className="h-8 w-8 text-green-600" />
                  <CardTitle className="text-xl">AI Visibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ensure your content is properly understood and indexed by AI search engines.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Zap className="h-8 w-8 text-green-600" />
                  <CardTitle className="text-xl">Future-Proof</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Stay ahead of the curve as search evolves from keywords to intent-based queries.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Globe className="h-8 w-8 text-green-600" />
                  <CardTitle className="text-xl">Wider Reach</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Reach users through AI assistants, chatbots, and next-gen search interfaces.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-blue-600 dark:bg-blue-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center text-white">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to optimize your website for AI?
                </h2>
                <p className="mx-auto max-w-[700px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed text-blue-100">
                  Get your free LLM readiness score today and start improving your AI visibility.
                </p>
              </div>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50" asChild>
                <Link href="#top">
                  Analyze Your Website
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
