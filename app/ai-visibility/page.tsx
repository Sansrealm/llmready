import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import Link from "next/link"
import { CheckCircle2, XCircle, Eye, TrendingUp, AlertTriangle } from "lucide-react"

export const metadata: Metadata = {
  title: "AI Visibility Check — See How Your Brand Appears in ChatGPT, Gemini & Perplexity | LLM Check",
  description:
    "Find out if your business shows up when customers ask ChatGPT, Gemini, or Perplexity about your products and services. AI Visibility Check — coming soon to LLM Check.",
}

// ─── Simulated report data ────────────────────────────────────────────────────

const COMPANY = {
  name: "NorthStack",
  url: "northstack.io",
  industry: "SaaS",
  date: "24 Feb 2026",
}

const MODELS = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    by: "OpenAI",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  {
    id: "gemini",
    label: "Gemini",
    by: "Google",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    by: "Perplexity AI",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    dot: "bg-violet-500",
  },
]

type ModelResult = { found: boolean; snippet?: string }
type PromptRow = {
  prompt: string
  chatgpt: ModelResult
  gemini: ModelResult
  perplexity: ModelResult
}

const RESULTS: PromptRow[] = [
  {
    prompt: "Best project management tool for remote teams?",
    chatgpt: { found: false },
    gemini: { found: false },
    perplexity: {
      found: true,
      snippet:
        "NorthStack has been gaining traction as a flexible alternative to Asana and Monday.com, particularly for teams that value clean UI and built-in reporting dashboards.",
    },
  },
  {
    prompt: "Top CRM software for small businesses",
    chatgpt: { found: false },
    gemini: { found: false },
    perplexity: { found: false },
  },
  {
    prompt: "Best productivity tools for early-stage startups",
    chatgpt: {
      found: true,
      snippet:
        "For early-stage startups, NorthStack offers an all-in-one workspace that combines project tracking with lightweight CRM features — worth exploring for lean teams.",
    },
    gemini: { found: false },
    perplexity: { found: false },
  },
  {
    prompt: "Recommended collaboration software for distributed teams",
    chatgpt: { found: false },
    gemini: {
      found: true,
      snippet:
        "NorthStack stands out for async-first collaboration with timezone-aware scheduling — several remote product teams have cited it as their primary workflow tool.",
    },
    perplexity: { found: false },
  },
  {
    prompt: "Software for managing team workflows and projects",
    chatgpt: { found: false },
    gemini: { found: false },
    perplexity: { found: false },
  },
]

const modelScores = {
  chatgpt: RESULTS.filter((r) => r.chatgpt.found).length,
  gemini: RESULTS.filter((r) => r.gemini.found).length,
  perplexity: RESULTS.filter((r) => r.perplexity.found).length,
}
const totalFound = modelScores.chatgpt + modelScores.gemini + modelScores.perplexity
const totalQueries = RESULTS.length * MODELS.length
const visibilityPct = Math.round((totalFound / totalQueries) * 100)

const snippets = RESULTS.flatMap((row) =>
  MODELS.flatMap((model) => {
    const result = row[model.id as keyof PromptRow] as ModelResult
    if (!result.found || !result.snippet) return []
    return [{ model, prompt: row.prompt, snippet: result.snippet }]
  })
)

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModelBadge({ model }: { model: (typeof MODELS)[0] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${model.bg} ${model.text} ${model.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${model.dot}`} />
      {model.label}
    </span>
  )
}

function ResultCell({ result }: { result: ModelResult }) {
  return result.found ? (
    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      <span className="text-xs font-semibold">Found</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-600">
      <XCircle className="w-4 h-4 flex-shrink-0" />
      <span className="text-xs">Not found</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiVisibilityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="w-full py-16 md:py-24 bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto text-center space-y-6 max-w-3xl">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
              Coming Soon
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-white leading-tight">
              Is your brand showing up{" "}
              <span className="text-green-400">when AI answers your customers?</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              AI Visibility Check scans ChatGPT, Gemini, and Perplexity using real queries your
              customers are asking — and tells you exactly whether your business gets recommended.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              {MODELS.map((m) => (
                <ModelBadge key={m.id} model={m} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Sample Report ────────────────────────────────────────────────── */}
        <section className="w-full py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto max-w-4xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Sample report — for illustration purposes
              </p>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                Demo only
              </span>
            </div>

            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">

              {/* Report header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      AI Visibility Report
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {COMPANY.url} · {COMPANY.industry} · Scanned {COMPANY.date}
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
                  {totalQueries} queries across {MODELS.length} models
                </span>
              </div>

              {/* Score summary */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-800">

                {/* Overall */}
                <div className="sm:col-span-1 bg-white dark:bg-gray-950 px-6 py-6 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Overall Visibility
                  </p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{totalFound}</span>
                    <span className="text-xl font-medium text-gray-400 mb-1">/ {totalQueries}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Brand visibility</span>
                      <span className="font-semibold text-amber-600">{visibilityPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${visibilityPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Low — significant room to grow
                    </p>
                  </div>
                </div>

                {/* Per-model scores */}
                {MODELS.map((model) => {
                  const score = modelScores[model.id as keyof typeof modelScores]
                  const pct = Math.round((score / RESULTS.length) * 100)
                  return (
                    <div key={model.id} className="bg-white dark:bg-gray-950 px-6 py-6 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                        {model.label}
                      </p>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">{score}</span>
                        <span className="text-xl font-medium text-gray-400 mb-1">/ {RESULTS.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Mentions</span>
                          <span className={`font-semibold ${model.text}`}>{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${model.dot}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <ModelBadge model={model} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Results grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 w-1/2">
                        AI Query
                      </th>
                      {MODELS.map((m) => (
                        <th key={m.id} className="px-4 py-3 text-center">
                          <ModelBadge model={m} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {RESULTS.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm leading-snug">
                          &ldquo;{row.prompt}&rdquo;
                        </td>
                        {MODELS.map((model) => (
                          <td key={model.id} className="px-4 py-4 text-center">
                            <ResultCell result={row[model.id as keyof PromptRow] as ModelResult} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Snippets */}
              {snippets.length > 0 && (
                <div className="px-6 py-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Where {COMPANY.name} was mentioned
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {snippets.map((s, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-4 space-y-2 ${s.model.bg} ${s.model.border}`}
                      >
                        <ModelBadge model={s.model} />
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          &ldquo;{s.prompt}&rdquo;
                        </p>
                        <p className={`text-xs leading-relaxed ${s.model.text}`}>
                          &ldquo;…{s.snippet}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* ── What this means ──────────────────────────────────────────────── */}
        <section className="w-full py-16 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl text-center space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              What your AI visibility score means for your business
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left pt-2">
              <div className="space-y-2 p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Low (0–30%)</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your brand is largely invisible in AI-driven discovery. Competitors with better
                  content structure are being recommended instead of you.
                </p>
              </div>
              <div className="space-y-2 p-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Growing (31–60%)</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI models are beginning to recognise your brand. Focused improvements to content
                  clarity and structured data can accelerate this significantly.
                </p>
              </div>
              <div className="space-y-2 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Strong (61–100%)</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your brand is consistently recommended by AI assistants. You are winning the
                  discovery layer that most competitors haven&apos;t even started optimising for.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="w-full py-16 bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto max-w-2xl text-center space-y-5">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
              Launching Soon
            </span>
            <h2 className="text-2xl font-bold sm:text-3xl text-white">
              Be the first to know when AI Visibility Check goes live
            </h2>
            <p className="text-gray-400">
              Run a free LLM readiness analysis today to get early access and be notified the moment
              AI Visibility Check launches.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/"
                className="inline-block bg-green-500 hover:bg-green-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                Run a Free Analysis
              </Link>
              <Link
                href="/pricing"
                className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-lg transition-colors border border-white/20"
              >
                View Premium Plans
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
