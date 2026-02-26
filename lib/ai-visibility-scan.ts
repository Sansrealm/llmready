/**
 * AI Visibility Scan Engine
 *
 * Queries ChatGPT (GPT-4o), Gemini (gemini-1.5-flash), and Perplexity (sonar)
 * with industry-specific prompts and scores how prominently the target brand
 * appears in each model's response.
 *
 * Scoring rubric (per query × model result):
 *   Mention    20 pts  — brand/domain found in response (binary gate)
 *   Prominence 30 pts  — where in the response (high/medium/low)
 *   Sentiment  30 pts  — GPT-4o-mini judges recommendation strength (-1→1)
 *   Citation   20 pts  — direct URL to brand domain present
 *
 * Cost: ~$0.05–0.06 per full scan (15 queries + up to 15 sentiment calls)
 * Latency: 10–18 seconds (all queries + sentiment run in parallel)
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPromptsForIndustry } from './ai-visibility-prompts';
import { normalizeUrl } from './db';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModelId = 'chatgpt' | 'gemini' | 'perplexity';
export type Prominence = 'high' | 'medium' | 'low';

export interface VisibilityResult {
  model: ModelId;
  prompt: string;
  found: boolean;
  snippet: string | null;
  prominence: Prominence | null;  // null when not found
  sentiment: number | null;       // -1 to 1, null when not found
  cited: boolean;                 // direct URL to brand domain in response
  score: number;                  // 0–100 weighted composite
  error: boolean;
}

export interface ScanOutput {
  normalizedUrl: string;
  industry: string | null;
  totalFound: number;
  totalQueries: number;
  results: VisibilityResult[];
  scannedAt: Date;
}

// ── Domain / brand extraction ──────────────────────────────────────────────────

function extractDomainTokens(url: string): { rootDomain: string; brandName: string; brandAlias: string } {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const brandName = hostname.split('.')[0]; // "acme" from "acme.io"
    // Alias: same as brandName for most sites (e.g. "monday" from "monday.com")
    const brandAlias = brandName;
    return { rootDomain: hostname, brandName, brandAlias };
  } catch {
    const clean = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const brandName = clean.split('.')[0];
    return { rootDomain: clean, brandName, brandAlias: brandName };
  }
}

// ── Step A: Entity extraction ─────────────────────────────────────────────────

/**
 * Returns the character index of the first brand/domain mention, or -1.
 * Checks: root domain URL, exact brand word-boundary, alias word-boundary.
 */
function findMentionIndex(text: string, rootDomain: string, brandName: string, brandAlias: string): number {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const patterns: RegExp[] = [
    new RegExp(escape(rootDomain).replace(/\\\./g, '\\.'), 'i'),
  ];

  if (brandName.length >= 3) {
    patterns.push(new RegExp(`\\b${escape(brandName)}\\b`, 'i'));
  }

  if (brandAlias.length >= 3 && brandAlias !== brandName) {
    patterns.push(new RegExp(`\\b${escape(brandAlias)}\\b`, 'i'));
  }

  let earliest = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match.index !== undefined) {
      if (earliest === -1 || match.index < earliest) {
        earliest = match.index;
      }
    }
  }
  return earliest;
}

function extractSnippet(text: string, mentionIndex: number): string {
  const matchText = text.slice(mentionIndex, mentionIndex + 30);
  const start = Math.max(0, mentionIndex - 80);
  const end = Math.min(text.length, mentionIndex + matchText.length + 80);
  const raw = text.slice(start, end).trim();
  return `${start > 0 ? '…' : ''}${raw}${end < text.length ? '…' : ''}`;
}

// ── Step B: Prominence mapping ─────────────────────────────────────────────────

/**
 * High   — brand appears within the first 150 words
 * Medium — brand in a bulleted list of ≤5 items, or general body text
 * Low    — brand in a "See Also" / bottom section, or a list of 10+ items
 */
function assessProminence(text: string, mentionIndex: number): Prominence {
  // Count words before the mention
  const wordsBefore = text.slice(0, mentionIndex).split(/\s+/).filter(Boolean).length;
  if (wordsBefore <= 150) return 'high';

  // Check if the mention falls after a "see also" / footer section
  const lower = text.toLowerCase();
  const bottomMarkers = ['see also', 'further reading', 'others to consider', 'related resources', 'alternatives include', 'honorable mention'];
  for (const marker of bottomMarkers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && mentionIndex > idx) return 'low';
  }

  // Inspect surrounding context for list density
  const section = text.slice(Math.max(0, mentionIndex - 400), mentionIndex + 400);
  const listItemMatches = section.match(/(?:^|\n)[ \t]*(?:[-*•]|\d+\.)[ \t]/gm) ?? [];
  const listCount = listItemMatches.length;

  if (listCount >= 10) return 'low';
  if (listCount >= 2 && listCount <= 5) return 'medium';

  return 'medium'; // body text, not in lead paragraph
}

// ── Step C: Sentiment — LLM-as-judge ─────────────────────────────────────────

/**
 * Uses GPT-4o-mini to score how strongly the response recommends the brand.
 * Returns a value in [-1, 1]:  -1 = avoid, 0 = neutral, 1 = highly recommended.
 * Falls back to 0 (neutral) on any error.
 */
async function assessSentiment(text: string, brandName: string): Promise<number> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content:
            `Rate how strongly the following text recommends "${brandName}" on a scale from -1 to 1.\n` +
            `-1 = explicitly warns against it or recommends avoiding it\n` +
            ` 0 = neutral or purely factual mention (e.g. "Brand X is a tool for Y")\n` +
            ` 1 = explicitly recommends it as a top choice (e.g. "Best choice for startups")\n\n` +
            `Respond with only a decimal number between -1 and 1. No explanation.\n\n` +
            `Text:\n${text.slice(0, 1200)}`,
        },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '0';
    const val = parseFloat(raw);
    return isNaN(val) ? 0 : Math.max(-1, Math.min(1, val));
  } catch {
    return 0; // neutral fallback
  }
}

// ── Step D: Citation detection ─────────────────────────────────────────────────

/**
 * Returns true if the response contains a URL pointing to the brand's root domain.
 * Works for both inline URLs (ChatGPT/Gemini) and Perplexity's source citations.
 */
function detectCitation(text: string, rootDomain: string): boolean {
  const escaped = rootDomain.replace(/\./g, '\\.');
  const urlPattern = new RegExp(`https?://[^\\s)\\]"'>]*${escaped}`, 'i');
  return urlPattern.test(text);
}

// ── Score computation ─────────────────────────────────────────────────────────

const WEIGHTS = { mention: 20, prominence: 30, sentiment: 30, citation: 20 } as const;

function computeScore(prominence: Prominence, sentiment: number, cited: boolean): number {
  let score = WEIGHTS.mention; // brand was found

  // Prominence: high=full, medium=half, low=10%
  if (prominence === 'high') score += WEIGHTS.prominence;
  else if (prominence === 'medium') score += WEIGHTS.prominence * 0.5;
  else score += WEIGHTS.prominence * 0.1;

  // Sentiment: map [-1, 1] → [0, 30]
  score += WEIGHTS.sentiment * ((sentiment + 1) / 2);

  // Citation
  if (cited) score += WEIGHTS.citation;

  return Math.round(Math.min(score, 100));
}

// ── Full per-response analysis ────────────────────────────────────────────────

async function analyzeVisibility(
  text: string,
  rootDomain: string,
  brandName: string,
  brandAlias: string
): Promise<Pick<VisibilityResult, 'found' | 'snippet' | 'prominence' | 'sentiment' | 'cited' | 'score'>> {
  const mentionIndex = findMentionIndex(text, rootDomain, brandName, brandAlias);

  if (mentionIndex === -1) {
    return { found: false, snippet: null, prominence: null, sentiment: null, cited: false, score: 0 };
  }

  const snippet = extractSnippet(text, mentionIndex);
  const prominence = assessProminence(text, mentionIndex);
  const cited = detectCitation(text, rootDomain);

  // Sentiment only needed when brand is found
  const sentiment = await assessSentiment(text, brandName);
  const score = computeScore(prominence, sentiment, cited);

  return { found: true, snippet, prominence, sentiment, cited, score };
}

// ── Model query functions ─────────────────────────────────────────────────────

const PROMPT_SUFFIX = ' Please list specific websites, tools, or companies by name in your answer.';

async function queryChatGPT(prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt + PROMPT_SUFFIX }],
    max_tokens: 500,
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content ?? '';
}

async function queryPerplexity(prompt: string): Promise<string> {
  const perplexity = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai',
  });
  const response = await perplexity.chat.completions.create({
    model: 'sonar',
    messages: [{ role: 'user', content: prompt + PROMPT_SUFFIX }],
    max_tokens: 500,
  });
  return response.choices[0]?.message?.content ?? '';
}

async function queryGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt + PROMPT_SUFFIX);
  return result.response.text();
}

const MODEL_FNS: Record<ModelId, (prompt: string) => Promise<string>> = {
  chatgpt: queryChatGPT,
  gemini: queryGemini,
  perplexity: queryPerplexity,
};

const MODELS: ModelId[] = ['chatgpt', 'gemini', 'perplexity'];
const QUERY_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ── Main scan function ────────────────────────────────────────────────────────

/**
 * Runs a full AI visibility scan for a given URL and industry.
 * Fires all 15 queries (5 prompts × 3 models) in parallel, then runs
 * per-response rubric analysis (entity, prominence, sentiment, citation)
 * also in parallel.
 */
export async function runVisibilityScan(
  url: string,
  industry: string | null,
  visibilityQueries?: string[]
): Promise<ScanOutput> {
  const normalizedUrl = normalizeUrl(url);
  const { rootDomain, brandName, brandAlias } = extractDomainTokens(url);
  const prompts =
    visibilityQueries && visibilityQueries.length === 5
      ? visibilityQueries
      : getPromptsForIndustry(industry);

  const tasks = prompts.flatMap((prompt) =>
    MODELS.map((model) => ({ prompt, model }))
  );

  // Phase 1: fire all LLM queries in parallel
  const rawResponses = await Promise.allSettled(
    tasks.map(({ prompt, model }) =>
      withTimeout(MODEL_FNS[model](prompt), QUERY_TIMEOUT_MS)
    )
  );

  // Phase 2: run rubric analysis in parallel for all successful responses
  const results: VisibilityResult[] = await Promise.all(
    rawResponses.map(async (outcome, i) => {
      const { prompt, model } = tasks[i];

      if (outcome.status === 'rejected') {
        console.error(`[ai-visibility] ${model} failed for "${prompt}":`, outcome.reason);
        return { model, prompt, found: false, snippet: null, prominence: null, sentiment: null, cited: false, score: 0, error: true } satisfies VisibilityResult;
      }

      try {
        const analysis = await analyzeVisibility(outcome.value, rootDomain, brandName, brandAlias);
        return { model, prompt, ...analysis, error: false } satisfies VisibilityResult;
      } catch (err) {
        console.error(`[ai-visibility] analysis failed for ${model}/"${prompt}":`, err);
        return { model, prompt, found: false, snippet: null, prominence: null, sentiment: null, cited: false, score: 0, error: true } satisfies VisibilityResult;
      }
    })
  );

  const totalFound = results.filter((r) => r.found).length;

  return {
    normalizedUrl,
    industry,
    totalFound,
    totalQueries: results.length,
    results,
    scannedAt: new Date(),
  };
}
