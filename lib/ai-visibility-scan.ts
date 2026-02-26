/**
 * AI Visibility Scan Engine
 *
 * Queries ChatGPT (GPT-4o), Gemini (gemini-1.5-flash), and Perplexity (sonar-pro)
 * with industry-specific prompts and detects whether the target domain/brand
 * appears in each model's response.
 *
 * Cost: ~$0.04 per full scan (15 queries across 3 models)
 * Latency: 8–15 seconds (all queries run in parallel)
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPromptsForIndustry } from './ai-visibility-prompts';
import { normalizeUrl } from './db';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModelId = 'chatgpt' | 'gemini' | 'perplexity';

export interface VisibilityResult {
  model: ModelId;
  prompt: string;
  found: boolean;
  snippet: string | null;
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

// ── Domain extraction ─────────────────────────────────────────────────────────

function extractDomainTokens(url: string): { rootDomain: string; brandName: string } {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const brandName = hostname.split('.')[0]; // "acme" from "acme.io"
    return { rootDomain: hostname, brandName };
  } catch {
    const clean = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    return { rootDomain: clean, brandName: clean.split('.')[0] };
  }
}

/**
 * Searches an AI response for a brand/domain mention.
 * Returns a short excerpt (up to ~160 chars) centred on the match, or null.
 * Uses word-boundary matching to avoid false positives.
 */
function extractMention(
  text: string,
  rootDomain: string,
  brandName: string
): string | null {
  // Escape dots in domain for regex
  const domainPattern = new RegExp(rootDomain.replace(/\./g, '\\.'), 'i');
  // Word-boundary match on brand name (min 3 chars to avoid noise)
  const brandPattern =
    brandName.length >= 3
      ? new RegExp(`\\b${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      : null;

  const patterns = brandPattern
    ? [domainPattern, brandPattern]
    : [domainPattern];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match.index !== undefined) {
      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + match[0].length + 80);
      const snippet = text.slice(start, end).trim();
      // Prefix/suffix ellipsis for context
      return `${start > 0 ? '…' : ''}${snippet}${end < text.length ? '…' : ''}`;
    }
  }
  return null;
}

// ── Model query functions ─────────────────────────────────────────────────────

const PROMPT_SUFFIX =
  ' Please list specific websites, tools, or companies by name in your answer.';

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
  // Perplexity uses an OpenAI-compatible API — no extra SDK needed
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
 * Fires all 15 queries (5 prompts × 3 models) in parallel.
 * Failed individual queries are marked error:true but don't abort the scan.
 *
 * If visibilityQueries (5 custom queries from GPT analysis) are provided,
 * they are used instead of the static industry prompts.
 */
export async function runVisibilityScan(
  url: string,
  industry: string | null,
  visibilityQueries?: string[]
): Promise<ScanOutput> {
  const normalizedUrl = normalizeUrl(url);
  const { rootDomain, brandName } = extractDomainTokens(url);
  const prompts =
    visibilityQueries && visibilityQueries.length === 5
      ? visibilityQueries
      : getPromptsForIndustry(industry);

  // Build task list: 5 prompts × 3 models = 15 tasks
  const tasks = prompts.flatMap((prompt) =>
    MODELS.map((model) => ({ prompt, model }))
  );

  // Run all in parallel — allSettled so one failure doesn't abort the rest
  const settled = await Promise.allSettled(
    tasks.map(async ({ prompt, model }) => {
      const text = await withTimeout(MODEL_FNS[model](prompt), QUERY_TIMEOUT_MS);
      const snippet = extractMention(text, rootDomain, brandName);
      return {
        model,
        prompt,
        found: snippet !== null,
        snippet,
        error: false,
      } satisfies VisibilityResult;
    })
  );

  const results: VisibilityResult[] = settled.map((outcome, i) => {
    const { prompt, model } = tasks[i];
    if (outcome.status === 'fulfilled') return outcome.value;
    console.error(`[ai-visibility] ${model} failed for "${prompt}":`, outcome.reason);
    return { model, prompt, found: false, snippet: null, error: true };
  });

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
