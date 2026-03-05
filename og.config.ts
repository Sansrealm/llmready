/**
 * og.config.ts — OG image content for every page.
 *
 * To update copy: edit the strings below and redeploy.
 * To add a new page: add a new key and reference it in metadata as:
 *   images: [{ url: "/og?page=<key>", width: 1200, height: 630 }]
 *
 * Field reference:
 *   badge       — small pill top-left (brand name / tagline)
 *   title       — array of lines; the LAST line gets the accent colour
 *   subtitle    — one or two sentences below the headline
 *   cta         — button label (omit to hide the button)
 *   card        — optional right-side mock panel (omit for text-only layout)
 *     header    — small label above the domain
 *     domain    — domain shown in the card
 *     rows      — list of { label, found } scan rows
 *     score     — number shown as the visibility score
 *     warning   — amber nudge text at the bottom of the card
 */

import type { OgConfig } from "@/lib/og-image";

const ogConfig: Record<string, OgConfig> = {
  // ── Homepage ────────────────────────────────────────────────────────────────
  home: {
    badge: "llmcheck.app",
    subtitle:
      "Scan ChatGPT, Gemini, and Perplexity to see if they cite you — or your competitors.",
    cta: "Free scan — instant results",
    variants: [
      {
        title: ["Does ChatGPT", "recommend", "your brand?"],
        card: {
          header: "AI Visibility Check",
          domain: "yoursite.com",
          rows: [
            { label: "ChatGPT",    found: true  },
            { label: "Gemini",     found: false },
            { label: "Perplexity", found: false },
          ],
          score: 33,
          warning: "2 of 3 AI assistants don't know you exist",
        },
      },
      {
        title: ["Does Gemini", "recommend", "your brand?"],
        card: {
          header: "AI Visibility Check",
          domain: "yoursite.com",
          rows: [
            { label: "ChatGPT",    found: false },
            { label: "Gemini",     found: true  },
            { label: "Perplexity", found: false },
          ],
          score: 40,
          warning: "2 of 3 AI assistants don't know you exist",
        },
      },
      {
        title: ["Does Perplexity", "recommend", "your brand?"],
        card: {
          header: "AI Visibility Check",
          domain: "yoursite.com",
          rows: [
            { label: "ChatGPT",    found: false },
            { label: "Gemini",     found: false },
            { label: "Perplexity", found: true  },
          ],
          score: 20,
          warning: "2 of 3 AI assistants don't know you exist",
        },
      },
      {
        title: ["Does AI", "recommend", "your brand?"],
        card: {
          header: "AI Visibility Check",
          domain: "yoursite.com",
          rows: [
            { label: "ChatGPT",    found: false },
            { label: "Gemini",     found: false },
            { label: "Perplexity", found: false },
          ],
          score: 0,
          warning: "No AI assistants are recommending you yet",
        },
      },
    ],
  },

  // ── AI Visibility page ───────────────────────────────────────────────────
  "ai-visibility": {
    badge: "llmcheck.app",
    title: ["Is your brand", "invisible to AI?"],
    subtitle:
      "Live scan across ChatGPT, Gemini, and Perplexity. See exactly which queries surface your brand — and which don't.",
    cta: "Run a free scan",
    card: {
      header: "Live AI Scan",
      domain: "yourbrand.com",
      rows: [
        { label: "ChatGPT",    found: false },
        { label: "Gemini",     found: false },
        { label: "Perplexity", found: true  },
      ],
      score: 20,
      warning: "Only 1 of 3 AI models can find you",
    },
  },

  // ── Pricing page ─────────────────────────────────────────────────────────
  pricing: {
    badge: "llmcheck.app — Pricing",
    title: ["Get your brand", "cited by AI,", "not ignored."],
    subtitle:
      "Unlimited scans, score history, and AI visibility audits. From $9/month.",
    cta: "Start free today",
  },

  // ── Methodology page ─────────────────────────────────────────────────────
  methodology: {
    badge: "llmcheck.app — Methodology",
    title: ["How we score", "AI visibility"],
    subtitle:
      "The Weighted Visibility Score (WVS) measures Mention, Prominence, Sentiment, and Citation across ChatGPT, Gemini, and Perplexity.",
    cta: "Read the full rubric",
  },
};

export default ogConfig;
