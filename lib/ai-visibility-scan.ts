/**
 * AI Visibility Scan Engine
 *
 * Queries ChatGPT (GPT-4o), Gemini (gemini-1.5-flash), and Perplexity (sonar)
 * with industry-specific prompts and scores how prominently the target brand
 * appears in each model's response.
 *
 * Scoring rubric (per query × model result):
 *   Mention    25 pts  — brand/domain found in response (binary gate)
 *   Prominence 45 pts  — where in the response (high/medium/low)
 *   Citation   30 pts  — direct URL to brand domain present
 *
 * Cost: ~$0.02–0.03 per full scan (15 queries)
 * Latency: 8–14 seconds (all queries run in parallel)
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

// ── Step C: Citation detection ─────────────────────────────────────────────────

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

const WEIGHTS = { mention: 25, prominence: 45, citation: 30 } as const;

function computeScore(prominence: Prominence, cited: boolean): number {
  let score = WEIGHTS.mention; // brand was found

  // Prominence: high=full, medium=half, low=10%
  if (prominence === 'high') score += WEIGHTS.prominence;
  else if (prominence === 'medium') score += WEIGHTS.prominence * 0.5;
  else score += WEIGHTS.prominence * 0.1;

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
): Promise<Pick<VisibilityResult, 'found' | 'snippet' | 'prominence' | 'cited' | 'score'>> {
  const mentionIndex = findMentionIndex(text, rootDomain, brandName, brandAlias);

  if (mentionIndex === -1) {
    return { found: false, snippet: null, prominence: null, cited: false, score: 0 };
  }

  const snippet = extractSnippet(text, mentionIndex);
  const prominence = assessProminence(text, mentionIndex);
  const cited = detectCitation(text, rootDomain);
  const score = computeScore(prominence, cited);

  return { found: true, snippet, prominence, cited, score };
}

// ── Model query functions ─────────────────────────────────────────────────────

const PROMPT_SUFFIX = ' Please list specific websites, tools, or companies by name in your answer.';

interface ModelResponse {
  text: string;
  /** Ranked source URLs returned by the model. Only populated for Perplexity
   *  (from the top-level `citations` field on the API response). Empty for
   *  ChatGPT and Gemini, which don't expose a separate citations list. */
  citations: string[];
}

async function queryChatGPT(prompt: string): Promise<ModelResponse> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: prompt + PROMPT_SUFFIX,
    });

    const messageBlocks = response.output.filter((block) => block.type === 'message');

    const text = messageBlocks
      .flatMap((block) => block.content)
      .filter((c) => c.type === 'output_text')
      .map((c) => c.text)
      .join('');

    const citations = messageBlocks
      .flatMap((block) => block.content)
      .filter((c) => c.type === 'output_text')
      .flatMap((c) => c.annotations ?? [])
      .filter((a) => a.type === 'url_citation')
      .map((a) => a.url)
      .filter((url): url is string => !!url)
      .slice(0, 5);

    return { text, citations };
  } catch {
    // Fallback to chat.completions if Responses API is unavailable
    const fallback = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt + PROMPT_SUFFIX }],
      max_tokens: 500,
      temperature: 0.3,
    });
    return { text: fallback.choices[0]?.message?.content ?? '', citations: [] };
  }
}

async function queryPerplexity(prompt: string): Promise<ModelResponse> {
  const perplexity = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai',
  });
  const response = await perplexity.chat.completions.create({
    model: 'sonar',
    messages: [{ role: 'user', content: prompt + PROMPT_SUFFIX }],
    max_tokens: 500,
  });
  // Perplexity returns the ranked source URLs it retrieved in a top-level
  // `citations` field alongside `choices`. Using this directly is more
  // reliable than regex-parsing URLs from the generated text.
  const citations = (response as unknown as { citations?: string[] }).citations ?? [];
  return { text: response.choices[0]?.message?.content ?? '', citations };
}

async function queryGemini(prompt: string): Promise<ModelResponse> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ googleSearchRetrieval: {} }],
  });
  const result = await model.generateContent(prompt + PROMPT_SUFFIX);

  // Extract grounded source URLs from grounding metadata.
  // Falls back to [] if grounding is unavailable (e.g. Vertex AI key without grounding enabled).
  const groundingChunks =
    result.response.candidates?.[0]
      ?.groundingMetadata?.groundingChunks ?? [];

  const citations = groundingChunks
    .map((chunk) => chunk.web?.uri)
    .filter((uri): uri is string => !!uri)
    .slice(0, 5);

  return { text: result.response.text(), citations };
}

const MODEL_FNS: Record<ModelId, (prompt: string) => Promise<ModelResponse>> = {
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
 * per-response rubric analysis (entity, prominence, citation)
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
    visibilityQueries && visibilityQueries.length >= 10
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
        return { model, prompt, found: false, snippet: null, prominence: null, cited: false, score: 0, error: true } satisfies VisibilityResult;
      }

      try {
        const { text, citations } = outcome.value;
        const analysis = await analyzeVisibility(text, rootDomain, brandName, brandAlias);

        // For Perplexity, override `cited` using the structured citations array
        // (ranked sources Perplexity retrieved from its index) rather than
        // relying on URL regex over the generated text.
        if (model === 'perplexity' && citations.length > 0) {
          const citedViaIndex = citations.some((u) => u.includes(rootDomain));
          if (citedViaIndex !== analysis.cited) {
            console.log(`[ai-visibility] Perplexity citation override for ${rootDomain}: text=${analysis.cited} → index=${citedViaIndex}`);
            analysis.cited = citedViaIndex;
            // Recompute score with corrected citation value
            if (analysis.found && analysis.prominence) {
              analysis.score = computeScore(analysis.prominence, citedViaIndex);
            }
          }
        }

        return { model, prompt, ...analysis, error: false } satisfies VisibilityResult;
      } catch (err) {
        console.error(`[ai-visibility] analysis failed for ${model}/"${prompt}":`, err);
        return { model, prompt, found: false, snippet: null, prominence: null, cited: false, score: 0, error: true } satisfies VisibilityResult;
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
