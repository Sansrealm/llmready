import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: 'WVS Methodology — How LLM Check Scores AI Visibility | LLM Check',
  description:
    'The complete technical breakdown of the Weighted Visibility Score (WVS): how LLM Check measures brand mention, prominence, sentiment, and citation across ChatGPT, Gemini, and Perplexity.',
  openGraph: {
    title: 'WVS Methodology — How LLM Check Scores AI Visibility',
    description:
      'Full rubric: 5 intent-based prompts × 3 LLMs = 15 data points. Scored across Mention (20 pts), Prominence (30 pts), Sentiment (30 pts), and Citation (20 pts).',
    url: 'https://llmcheck.app/methodology',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WVS Methodology — LLM Check',
    description: 'How the Weighted Visibility Score is calculated across ChatGPT, Gemini, and Perplexity.',
    images: ['/og-image.png'],
  },
  keywords: [
    'Weighted Visibility Score',
    'WVS methodology',
    'AI visibility scoring',
    'LLM brand visibility',
    'AEO metrics',
    'ChatGPT brand mention',
    'AI search ranking',
    'answer engine optimization',
  ],
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Weighted Visibility Score (WVS) — Full Methodology',
  description:
    'Technical specification of the WVS rubric used by LLM Check to measure brand visibility across ChatGPT, Gemini, and Perplexity.',
  url: 'https://llmcheck.app/methodology',
  author: { '@type': 'Organization', name: 'LLM Check', url: 'https://llmcheck.app' },
  publisher: { '@type': 'Organization', name: 'LLM Check', url: 'https://llmcheck.app' },
  dateModified: '2026-03-01',
  mainEntity: {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How is the Weighted Visibility Score (WVS) calculated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The WVS is calculated from four factors across 15 data points (5 prompts × 3 models). Mention contributes 20 points (binary gate — brand must appear for other scores to apply). Prominence contributes up to 30 points: high prominence (brand in first 150 words) = 30 pts, medium = 15 pts, low = 3 pts. Sentiment contributes up to 30 points, mapped from a GPT-4o-mini judgment of recommendation strength on a -1 to 1 scale. Citation (direct URL to brand domain present in response) contributes 20 points.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which AI models does LLM Check scan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LLM Check scans three models: ChatGPT (GPT-4o), Gemini (gemini-1.5-flash), and Perplexity (sonar). Each model is queried with 5 industry-specific prompts, producing 15 scored data points per scan.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does LLM Check determine prominence?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Prominence is assessed by the position of the brand mention within the LLM response. High prominence: brand appears within the first 150 words (30 pts). Low prominence: brand appears after "see also", "further reading", or similar footer markers, or in a list of 10+ items (3 pts). Medium prominence: all other positions (15 pts).',
        },
      },
    ],
  },
};

export default function MethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1">

        {/* Hero */}
        <section className="w-full py-14 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-3">
              Technical Documentation
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
              Weighted Visibility Score (WVS) — Methodology
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
              The complete rubric LLM Check uses to measure how prominently and accurately a brand
              is cited by ChatGPT, Gemini, and Perplexity.
            </p>
          </div>
        </section>

        {/* Overview */}
        <section className="w-full py-14 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              The Weighted Visibility Score (WVS) quantifies a brand&apos;s &quot;Share of Voice&quot; in
              AI-generated responses. Each scan fires <strong>5 intent-based prompts</strong> against{' '}
              <strong>3 LLMs</strong> (ChatGPT, Gemini, Perplexity), producing{' '}
              <strong>15 scored data points</strong> per scan. Every data point is evaluated
              across four dimensions, each contributing a defined number of points to a 0–100 score.
            </p>

            {/* Score breakdown summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {[
                { label: 'Mention', pts: '20 pts', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
                { label: 'Prominence', pts: '30 pts', color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' },
                { label: 'Sentiment', pts: '30 pts', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' },
                { label: 'Citation', pts: '20 pts', color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
              ].map(({ label, pts, color }) => (
                <div key={label} className={`rounded-xl p-4 text-center ${color}`}>
                  <p className="text-2xl font-bold">{pts}</p>
                  <p className="text-sm font-medium mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dimension breakdown */}
        <section className="w-full py-14 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl space-y-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Scoring Dimensions</h2>

            {/* Mention */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-sm">A</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mention — 20 points</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                A binary gate. The brand&apos;s root domain, brand name, or known alias must appear in the
                LLM&apos;s response for any other score to apply. If there is no mention, the score for
                that data point is 0. Detection checks root domain URL, exact brand name (word boundary),
                and registered aliases.
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Result</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr><td className="px-4 py-2 text-gray-600 dark:text-gray-400">Brand found in response</td><td className="px-4 py-2 font-medium text-blue-700 dark:text-blue-300">20</td></tr>
                    <tr><td className="px-4 py-2 text-gray-600 dark:text-gray-400">Not found</td><td className="px-4 py-2 font-medium text-gray-500">0 (scan ends here)</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Prominence */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-sm">B</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Prominence — up to 30 points</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Where in the response the brand appears. Being in the opening paragraph of a ChatGPT
                answer signals primary recommendation. Appearing only in a long &quot;alternatives&quot; list
                at the bottom signals low authority.
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Level</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Condition</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr><td className="px-4 py-2 font-medium text-green-700 dark:text-green-400">High</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">Brand appears within first 150 words of response</td><td className="px-4 py-2 font-medium text-indigo-700 dark:text-indigo-300">30</td></tr>
                    <tr><td className="px-4 py-2 font-medium text-amber-700 dark:text-amber-400">Medium</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">Body text, small list (2–5 items), general recommendation</td><td className="px-4 py-2 font-medium text-indigo-700 dark:text-indigo-300">15</td></tr>
                    <tr><td className="px-4 py-2 font-medium text-red-700 dark:text-red-400">Low</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">After &quot;See Also&quot; / &quot;Further Reading&quot; markers, or list of 10+ items</td><td className="px-4 py-2 font-medium text-indigo-700 dark:text-indigo-300">3</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sentiment */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-sm">C</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sentiment — up to 30 points</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                LLM-as-judge scoring. GPT-4o-mini evaluates the surrounding context of the brand mention
                and rates the strength of the recommendation on a scale of <strong>−1 to +1</strong>.
                The value is linearly mapped to 0–30 points. A purely neutral mention (&quot;Brand X is a
                tool for Y&quot;) scores 0.5 on the scale (15 pts). An explicit top recommendation
                scores close to 1.0 (30 pts). A warning against the brand scores close to −1 (0 pts).
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Sentiment value</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Meaning</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr><td className="px-4 py-2 font-medium text-green-700 dark:text-green-400">+1.0</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">Explicitly recommended as top choice</td><td className="px-4 py-2 font-medium text-purple-700 dark:text-purple-300">30</td></tr>
                    <tr><td className="px-4 py-2 font-medium text-blue-700 dark:text-blue-400">0.0</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">Neutral / purely factual mention</td><td className="px-4 py-2 font-medium text-purple-700 dark:text-purple-300">15</td></tr>
                    <tr><td className="px-4 py-2 font-medium text-red-700 dark:text-red-400">−1.0</td><td className="px-4 py-2 text-gray-600 dark:text-gray-400">Explicitly warned against</td><td className="px-4 py-2 font-medium text-purple-700 dark:text-purple-300">0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Citation */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold text-sm">D</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Citation (Provenance) — 20 points</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                A direct, clickable URL pointing to the brand&apos;s root domain must appear in the LLM
                response. This is the highest-trust signal — it means the AI model is actively directing
                users to the source, not just mentioning the brand by name. Detected via URL pattern
                matching against the brand&apos;s root domain.
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Result</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr><td className="px-4 py-2 text-gray-600 dark:text-gray-400">Direct URL to brand domain present in response</td><td className="px-4 py-2 font-medium text-green-700 dark:text-green-300">20</td></tr>
                    <tr><td className="px-4 py-2 text-gray-600 dark:text-gray-400">No URL (name-only mention)</td><td className="px-4 py-2 font-medium text-gray-500">0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Query methodology */}
        <section className="w-full py-14 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Query Methodology</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              LLM Check generates <strong>5 intent-based prompts</strong> per scan using GPT-4o, tailored
              to the site&apos;s industry and content. Each prompt is sent to all three models in parallel,
              producing 15 independent responses. Prompts are constructed to reflect realistic user
              queries (&quot;What is the best tool for X?&quot;) and include a suffix instructing the model
              to name specific tools and companies, maximising the chance of brand-level responses.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { model: 'ChatGPT', detail: 'GPT-4o via OpenAI API', color: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' },
                { model: 'Gemini', detail: 'gemini-1.5-flash via Google AI', color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10' },
                { model: 'Perplexity', detail: 'sonar model via Perplexity API', color: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10' },
              ].map(({ model, detail, color }) => (
                <div key={model} className={`rounded-xl border p-4 ${color}`}>
                  <p className="font-semibold text-gray-900 dark:text-white">{model}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-14 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">See your WVS score</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Run a free LLM Readiness audit, then unlock the full AI Visibility scan to get your Weighted Visibility Score.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Analyze Your Site — Free
              </Link>
              <Link
                href="/ai-visibility"
                className="inline-block border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium px-6 py-3 rounded-lg transition-colors"
              >
                See Example Report →
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
