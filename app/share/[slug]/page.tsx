/**
 * Public Share Page - app/share/[slug]/page.tsx
 *
 * Displays publicly shared LLM readiness analysis reports.
 * This is a Server Component that fetches data at request time.
 *
 * Features:
 * - Server-side rendering (no client-side state)
 * - Dynamic routing with [slug] parameter
 * - SEO-optimized metadata generation
 * - Public access (no authentication required)
 * - 404 handling for invalid/expired shares
 * - CTA section to drive conversions
 *
 * Route: /share/[slug]
 * API Endpoint: GET /api/share/[slug]
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { SiteMetric } from '@/lib/types';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

interface SharedAnalysis {
  id: string;
  url: string;
  overall_score: number;
  parameters: SiteMetric[];
  analyzed_at: string;
  shared_at?: string;
  share_expires_at?: string;
}

// Fetch shared analysis from API
async function getSharedAnalysis(slug: string): Promise<SharedAnalysis | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/share/${slug}`,
      { cache: 'no-store' } // Don't cache shared content
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching shared analysis:', error);
    return null;
  }
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const analysis = await getSharedAnalysis(slug);

  if (!analysis) {
    return {
      title: 'Share Link Not Found - LLM Check',
      description: 'This share link may have expired or does not exist.',
    };
  }

  return {
    title: `LLM Analysis: ${analysis.overall_score}/100 - ${analysis.url}`,
    description: `View the LLM readiness analysis for ${analysis.url}. Overall score: ${analysis.overall_score}/100`,
    openGraph: {
      title: `LLM Readiness Score: ${analysis.overall_score}/100`,
      description: `Analysis results for ${analysis.url}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `LLM Readiness Score: ${analysis.overall_score}/100`,
      description: `Analysis results for ${analysis.url}`,
    },
  };
}

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { slug } = await params;
  const analysis = await getSharedAnalysis(slug);

  if (!analysis) {
    notFound();
  }

  // Determine score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Shared Report Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 py-3">
        <div className="container px-4 mx-auto">
          <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <span>📊</span>
            <span>This is a publicly shared analysis report</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container px-4 py-8 mx-auto max-w-6xl">
        {/* URL Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            LLM Readiness Analysis
          </h1>
          <p className="text-lg text-muted-foreground break-all">
            {analysis.url}
          </p>
        </div>

        {/* Overall Score */}
        <div className="mb-8 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-center">
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(analysis.overall_score)}`}>
              {analysis.overall_score}
              <span className="text-3xl text-muted-foreground">/100</span>
            </div>
            <p className="text-lg text-muted-foreground">
              Overall LLM Readiness Score
            </p>
            <div className="mt-4 w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  analysis.overall_score >= 80 ? 'bg-green-600' :
                  analysis.overall_score >= 60 ? 'bg-blue-600' :
                  analysis.overall_score >= 40 ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}
                style={{ width: `${analysis.overall_score}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Analysis Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.parameters.map((param, index) => (
              <div
                key={index}
                className="p-4 bg-card rounded-lg border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-sm">{param.name}</h3>
                  <span className={`text-xl font-bold ${getScoreColor(param.score)}`}>
                    {param.score}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      param.score >= 80 ? 'bg-green-600' :
                      param.score >= 60 ? 'bg-blue-600' :
                      param.score >= 40 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${param.score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {param.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Share Info */}
        <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p>
            Analyzed on: {new Date(analysis.analyzed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            {analysis.share_expires_at && (
              <>
                {' • '}
                Expires: {new Date(analysis.share_expires_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </>
            )}
          </p>
        </div>
      </main>

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-white to-blue-50 dark:from-gray-950 dark:to-gray-900 py-16 border-t">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Analyze Your Own Website
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get your LLM readiness score, detailed parameter analysis, and actionable recommendations to improve your website's AI visibility.
          </p>
          <Link href="/">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Free Analysis
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
