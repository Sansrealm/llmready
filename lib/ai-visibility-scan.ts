/**
 * AI Visibility Scan Engine
 *
 * Queries ChatGPT (GPT-4o), Gemini (gemini-2.5-flash), and Perplexity (sonar)
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
  citedUrls: string[];            // all source URLs the engine returned for this query
  mentionedBrands: string[];      // brands extracted from response text by Haiku (excludes target brand)
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

// ── Shared helpers ────────────────────────────────────────────────────────────

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── Domain / brand extraction ──────────────────────────────────────────────────

function extractDomainTokens(url: string, pageTitle?: string): { rootDomain: string; brandName: string; brandAlias: string } {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const brandName = hostname.split('.')[0]; // "acme" from "acme.io"

    // Derive a human-readable alias from the page title when available.
    // e.g. "Internet Pipes – Newsletter for Entrepreneurs" → "Internet Pipes"
    let brandAlias = brandName;
    if (pageTitle) {
      const titlePart = pageTitle
        .split(/[|\-–—]/)[0]  // take text before first separator
        .trim();
      if (titlePart.length >= 3 && titlePart.length <= 60) {
        brandAlias = titlePart;
      }
    }

    return { rootDomain: hostname, brandName, brandAlias };
  } catch {
    const clean = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const brandName = clean.split('.')[0];
    return { rootDomain: clean, brandName, brandAlias: brandName };
  }
}

/**
 * Extracts product-name tokens from page HTML.
 * Targets common product naming patterns across industries:
 *   - Letter+number codes: "CX-90", "RX350", "PS5", "Model 3"
 *   - TitleCase+number run-ons: "iPhone15", "Mazda3", "Galaxy S24"
 * Used by findMentionIndex to catch brand-implicit responses that name
 * the product without repeating the parent brand name.
 */
function extractProductTokens(html: string): string[] {
  const tokens = new Set<string>();

  // Pull text from title, h1/h2, and meta description
  const sources: string[] = [];
  const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleM) sources.push(titleM[1]);
  for (const m of html.matchAll(/<h[12][^>]*>([^<]+)<\/h[12]>/gi)) sources.push(m[1]);
  const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  if (descM) sources.push(descM[1]);

  const combined = sources.join(' ');

  // Pattern 1: letter(s) + optional separator + digit(s) (CX-90, RX350, Model 3, PS5)
  for (const m of combined.matchAll(/\b([A-Z]{1,4}[-\s]?\d{1,4}[A-Za-z]?)\b/g)) {
    if (m[1].length >= 3) tokens.add(m[1]);
  }
  // Pattern 2: TitleCase word fused with digits (iPhone15, Mazda3, GalaxyS24)
  for (const m of combined.matchAll(/\b([A-Z][a-z]+\d+[A-Za-z]*)\b/g)) {
    if (m[1].length >= 4) tokens.add(m[1]);
  }

  return [...tokens].slice(0, 10);
}

/**
 * Fetches the page title and product tokens for a URL.
 * Non-blocking — returns nulls/empty on any error.
 */
async function fetchPageMetadata(url: string): Promise<{ title: string | null; productTokens: string[] }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = match ? match[1].trim() : null;
    const productTokens = extractProductTokens(html);
    if (productTokens.length > 0) {
      console.log(`[ai-visibility] product tokens from page: ${productTokens.join(', ')}`);
    }
    return { title, productTokens };
  } catch {
    return { title: null, productTokens: [] };
  }
}

// ── Step A: Entity extraction ─────────────────────────────────────────────────

/**
 * Returns the character index of the first brand/domain mention, or -1.
 * Checks: root domain URL, brand word-boundary, alias word-boundary,
 * and (Option B) product token patterns scraped from the brand's page.
 */
function findMentionIndex(
  text: string,
  rootDomain: string,
  brandName: string,
  brandAlias: string,
  productTokens: string[] = [],
): number {
  const patterns: RegExp[] = [
    new RegExp(escapeRegex(rootDomain).replace(/\\\./g, '\\.'), 'i'),
  ];

  if (brandName.length >= 3) {
    patterns.push(new RegExp(`\\b${escapeRegex(brandName)}\\b`, 'i'));
  }

  if (brandAlias.length >= 3 && brandAlias.toLowerCase() !== brandName.toLowerCase()) {
    const aliasPattern = brandAlias.includes(' ')
      ? new RegExp(escapeRegex(brandAlias), 'i')
      : new RegExp(`\\b${escapeRegex(brandAlias)}\\b`, 'i');
    patterns.push(aliasPattern);
  }

  // Option B: product token patterns (e.g. "CX-90", "Mazda3") scraped from the brand page.
  // Catches brand-implicit responses that name a product without the parent brand.
  for (const token of productTokens) {
    if (token.length >= 3) {
      patterns.push(new RegExp(escapeRegex(token), 'i'));
    }
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
  brandAlias: string,
  productTokens: string[] = [],
): Promise<Pick<VisibilityResult, 'found' | 'snippet' | 'prominence' | 'cited' | 'score'>> {
  const mentionIndex = findMentionIndex(text, rootDomain, brandName, brandAlias, productTokens);

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

  // Tier 1: Responses API with web_search_preview (requires OpenAI Tier 1+)
  // Hard cap at 25s so we don't eat the full 45s outer timeout on this tier alone.
  try {
    const response = await Promise.race([
      openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: prompt + PROMPT_SUFFIX,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Responses API per-tier timeout')), 25_000)
      ),
    ]);

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

    if (!text.trim()) throw new Error('Responses API returned empty text');

    console.log(`[chatgpt] Tier 1 (Responses API) succeeded, text length: ${text.length}`);
    return { text, citations };
  } catch (err1) {
    console.warn('[chatgpt] Tier 1 (Responses API) failed, trying gpt-4o-search-preview:', (err1 as Error).message);
  }

  // Tier 2: gpt-4o-search-preview — live search, no special tier required.
  // Cap at 12s: Responses API already burned up to 25s, so gpt-4o (Tier 3)
  // must have enough of the outer 45s window to run reliably.
  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-search-preview',
        messages: [{ role: 'user', content: prompt + PROMPT_SUFFIX }],
        max_tokens: 500,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('gpt-4o-search-preview per-tier timeout')), 12_000)
      ),
    ]);

    const text = response.choices[0]?.message?.content ?? '';
    const annotations = ((response.choices[0]?.message as unknown) as Record<string, unknown>)?.annotations as Array<Record<string, unknown>> ?? [];
    const citations = annotations
      .filter((a) => a.type === 'url_citation')
      .map((a) => (a.url_citation as Record<string, string>)?.url)
      .filter((url): url is string => !!url)
      .slice(0, 5);

    if (!text.trim()) throw new Error('gpt-4o-search-preview returned empty text');

    console.log(`[chatgpt] Tier 2 (gpt-4o-search-preview) succeeded, text length: ${text.length}`);
    return { text, citations };
  } catch (err2) {
    console.warn('[chatgpt] Tier 2 (gpt-4o-search-preview) failed, falling back to gpt-4o:', (err2 as Error).message);
  }

  // Tier 3: standard gpt-4o — no live search, always available
  console.log('[chatgpt] Tier 3 (gpt-4o standard) — no live search');
  const fallback = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt + PROMPT_SUFFIX }],
    max_tokens: 500,
    temperature: 0.3,
  });
  return { text: fallback.choices[0]?.message?.content ?? '', citations: [] };
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
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} } as object],
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

/**
 * Returns true if the response appears to be focused on a *different* entity
 * rather than the target brand. Used as a guard in the Option A query-context
 * fallback to prevent crediting a response that recommends a competitor.
 *
 * Heuristic: if any TitleCase proper noun (not a stop-word, not the target brand)
 * appears 3+ times, the response is likely about that entity instead.
 * Best-effort — once mentionedBrands extraction is live this can be derived
 * from the Haiku output instead.
 */
function isCompetitorFocusedResponse(text: string, brandName: string, rootDomain: string): boolean {
  const titleCaseWords = text.match(/\b[A-Z][a-z]{2,20}\b/g) ?? [];

  const STOP_WORDS = new Set([
    'the','this','that','these','those','there','their','they','them',
    'for','and','with','from','into','over','after','about','before',
    'some','such','both','each','most','other','more','also','just',
    'when','where','what','how','why','which','while','than','then',
    'you','your','its','our','all','but','not','are','was','were',
    'has','have','had','will','can','may','should','would','could',
    // common product/pricing words that start sentences
    'price','prices','model','models','base','trim','year','version',
    'starting','standard','available','including','offering','option',
    'features','package','includes','offers','comes','provides',
    'compare','compared','unlike','however','although','while',
  ]);

  const brandLower = brandName.toLowerCase();
  const domainToken = rootDomain.split('.')[0].toLowerCase();

  const freq = new Map<string, number>();
  for (const w of titleCaseWords) {
    const lower = w.toLowerCase();
    if (STOP_WORDS.has(lower) || lower === brandLower || lower === domainToken) continue;
    freq.set(lower, (freq.get(lower) ?? 0) + 1);
  }

  for (const count of freq.values()) {
    if (count >= 3) return true;
  }
  return false;
}

const MODEL_FNS: Record<ModelId, (prompt: string) => Promise<ModelResponse>> = {
  chatgpt: queryChatGPT,
  gemini: queryGemini,
  perplexity: queryPerplexity,
};

const MODELS: ModelId[] = ['chatgpt', 'gemini', 'perplexity'];
const QUERY_TIMEOUT_MS = 45_000;

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

  // Fetch page title (brand alias) and product tokens (Option B) in one request.
  // Non-blocking: falls back to domain slug / empty tokens if the fetch fails.
  const { title: pageTitle, productTokens } = await fetchPageMetadata(url);
  if (pageTitle) {
    console.log(`[ai-visibility] page title for brand detection: "${pageTitle}"`);
  }

  const { rootDomain, brandName, brandAlias } = extractDomainTokens(url, pageTitle ?? undefined);
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
        return { model, prompt, found: false, snippet: null, prominence: null, cited: false, citedUrls: [], mentionedBrands: [], score: 0, error: true } satisfies VisibilityResult;
      }

      try {
        const { text, citations } = outcome.value;
        const analysis = await analyzeVisibility(text, rootDomain, brandName, brandAlias, productTokens);

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

        // Citation-based found fallback: if text matching failed but the brand domain
        // appears in the model's source citations (e.g. Gemini grounding chunks), mark
        // as found with conservative attribution. Mirrors the Perplexity cited override.
        if (!analysis.found) {
          const citationFallback = citations.find((u) => u.includes(rootDomain));
          if (citationFallback) {
            console.log(`[ai-visibility] citation-fallback found for ${rootDomain} (${model}): ${citationFallback}`);
            analysis.found = true;
            analysis.snippet = `Retrieved from ${citationFallback}`;
            analysis.prominence = 'low';
            analysis.cited = true;
            analysis.score = computeScore('low', true);
          }
        }

        // Option A — query-context signal: if both text matching and citation matching
        // failed, but the prompt itself names the brand, infer a likely hit when:
        //   1. response is substantive (≥ 50 words)
        //   2. model doesn't hedge ("I don't have", "I cannot", etc.)
        //   3. response isn't focused on a *different* entity (competitor guard)
        // Conservative: low prominence, no citation credit.
        if (!analysis.found) {
          const queryNamesBrand = [brandName, rootDomain].some(
            (token) => new RegExp(`\\b${escapeRegex(token)}\\b`, 'i').test(prompt)
          );

          if (queryNamesBrand) {
            const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            const hedgePattern = /\b(i don'?t have|i cannot|i can'?t|i'?m unable|no information|not available|don'?t know|unable to find|i apologize)\b/i;
            const substantive = wordCount >= 50 && !hedgePattern.test(text);
            const notCompetitorFocused = !isCompetitorFocusedResponse(text, brandName, rootDomain);

            if (substantive && notCompetitorFocused) {
              console.log(`[ai-visibility] query-context fallback for ${rootDomain} (${model}): prompt names brand, response is substantive (${wordCount}w)`);
              analysis.found = true;
              analysis.snippet = text.slice(0, 160).trimEnd() + (text.length > 160 ? '…' : '');
              analysis.prominence = 'low';
              // cited stays false — no URL evidence
              analysis.score = computeScore('low', false);
            }
          }
        }

        // mentionedBrands is populated by the route after the scan via Haiku extraction
        return { model, prompt, ...analysis, citedUrls: citations, mentionedBrands: [], error: false } satisfies VisibilityResult;
      } catch (err) {
        console.error(`[ai-visibility] analysis failed for ${model}/"${prompt}":`, err);
        return { model, prompt, found: false, snippet: null, prominence: null, cited: false, citedUrls: [], mentionedBrands: [], score: 0, error: true } satisfies VisibilityResult;
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
