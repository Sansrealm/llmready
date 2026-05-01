# Product Guardrails

> **For Claude Code: Read this BEFORE any fix, refactor, or "improvement" to existing functionality.** If the behaviour you're about to change is documented here, surface it to the user — do not silently "fix" a fundamental constraint.

These are deliberate product constraints, not bugs. Items below describe behaviour that *looks* like something to fix and *isn't*. Add a new entry whenever the answer to "why is this not better?" is "physics / vendor / scope" rather than "we just haven't fixed it yet."

Format: **Constraint** → why it's a constraint → anti-patterns to avoid → where in code.

---

## 1. AI Visibility scan results are non-deterministic

ChatGPT / Gemini / Perplexity return different responses to the same prompt over time. Same scan re-run an hour later can show ±5–10% variance in cited count. This is a property of generative LLMs and search-grounding pipelines — not a precision bug.

**Don't try to "fix" by:**
- Adding majority-voting across multiple parallel runs of the same query
- Deeper / longer caching to "lock in" a result beyond the existing 72h cache
- Retry-until-stable loops that re-run a query if a value differs from the previous scan
- Lowering temperature on `queryChatGPT` / `queryPerplexity` / `queryGemini` to "stabilise" output

**Where:** `lib/ai-visibility-scan.ts` — the three `queryXXX` functions and `runVisibilityScan`.

---

## 2. Coverage is English, US-centric

Industry prompts in `lib/ai-visibility-prompts.ts` are hard-coded English. All three engines (ChatGPT, Gemini, Perplexity) factor in inferred user geography — same brand can show different visibility from different regions. Multilingual / region-aware coverage is a future feature, not a present bug.

**Don't try to "fix" by:**
- Adding language detection on the URL and translating prompts on the fly
- Stripping geo signals (proxies, headers) to "normalise" results — the engines decide on their backend
- Treating non-English brand names as edge cases needing special character handling beyond what's already there

**Where:** `lib/ai-visibility-prompts.ts`, `lib/ai-visibility-scan.ts` (no geo handling exists today).

---

## 3. "Found" and "cited" are different signals — both intentional

A brand can be **mentioned by name** in an LLM response without being **cited** (no URL link to the brand's site). The visibility scan tracks both:
- `found = true` — brand name appears in response text
- `cited = true` — engine returned a URL pointing to the brand domain

The aggregate "X/Y cited" rate counts a row when EITHER is true (matches the live results page). The two flags are kept separately so future surfaces can distinguish them.

**Don't try to "fix" by:**
- Collapsing `found` and `cited` into a single boolean
- Treating `found && !cited` as a data-quality issue
- Removing the `found || cited` aggregation in `computeCitationStats` to "tighten" the number

**Where:** `lib/ai-visibility-report.ts` (`computeCitationStats`), `lib/ai-visibility-scan.ts` (`analyseResponse`).

---

## 4. Single-URL analysis is by design

Each `/api/analyze` call analyses the exact URL submitted. Submitting `example.com` does NOT crawl `/blog`, `/pricing`, etc. This is intentional — each URL gets its own scoring + visibility scan. Multi-URL per domain (analyse a portfolio of pages for one site) is a planned future feature, not a current shortfall.

**Don't try to "fix" by:**
- Adding sitemap discovery / sub-URL crawling to `/api/analyze`
- Treating the score as a "site-wide" score (it's a page-level score)
- Auto-rolling-up multiple analyses into a single domain-level number

**Where:** `app/api/analyze/route.ts`, `lib/ai-visibility-scan.ts`.

---

## 5. No scheduled rescans — score history is user-initiated only

Trend lines on `/results` and `/analyses` reflect only the times a user clicked Re-analyze. Gaps in the trend are NOT missing data; they're the absence of a user-driven scan. A scheduled rescans + alerts feature is on the roadmap (Phase 3+), not in scope today.

**Don't try to "fix" by:**
- Adding cron-based rescans behind the scenes to "smooth" the trend
- Interpolating between two data points to fill gaps
- Treating a stale last-scanned timestamp as a problem to alert on

**Where:** `components/score-history-widget.tsx`, `lib/db.ts` (`getAnalysisHistory`, `getVisibilityTrendByModel`).

---

## 6. ChatGPT 3-tier fallback chain is intentional

`queryChatGPT` tries Tier 1 (Responses API w/ web_search_preview) → Tier 2 (`gpt-4o-search-preview`) → Tier 3 (`gpt-4o`). The chain exists because Responses API requires OpenAI Tier 1+ accounts and gpt-4o-search-preview can rate-limit. Tiers 2 and 3 produce no `cited_urls` (no web grounding), which the rest of the pipeline handles via the `found || cited` waterfall.

**Don't try to "fix" by:**
- Removing tiers to "simplify" — accounts on free OpenAI tier will have ChatGPT silently disappear from scans
- Increasing the per-tier timeouts beyond the current 25s + 12s budget (would eat into Gemini / Perplexity headroom)
- Treating "ChatGPT only returned text, no citations" as a bug — that's Tier 3 working as designed

**Where:** `lib/ai-visibility-scan.ts:339-421` (`queryChatGPT`).

---

## 7. Page-blocked detection (`401`/`403`/refused) means we did NOT score the site

When a site blocks our crawler, the score is correctly hidden behind an amber banner ("Optimization score unavailable"). Pretending we have a score by falling back to cached HTML, archive.org snapshots, or a degraded scoring path would produce wrong scores and erode trust.

**Don't try to "fix" by:**
- Adding fallback fetches to a Google cache / archive.org / Wayback
- Computing a partial score from sitemap-derived metadata when the page is blocked
- Setting `page_blocked = false` and letting the parameters render with the LLM's "no content" response

**Where:** `app/api/analyze/route.ts` (`pageBlocked` detection), `app/results/page.tsx` (banner rendering).

---

## 8. Brand normalisation across LLMs is a Phase 3 prerequisite, not a present bug

`mentioned_brands` is captured per-engine but is NOT normalised across engines (ChatGPT writes "HubSpot", Gemini might write "Hubspot", Perplexity might write "HubSpot CRM"). This is a known issue tagged as a P1 gap in `CLAUDE.md`. It is NOT to be fixed inline as part of unrelated work — it needs a coordinated normalisation strategy designed alongside the agency competitor-tracking views (Phase 3).

**Don't try to "fix" by:**
- Adding ad-hoc string normalisation in the citation-cards rendering path
- Lowercase-keying the deduplication during scan writeback
- Inferring "same brand" from substring overlap

**Where:** `lib/ai-visibility-scan.ts` (writeback path), share/PDF rendering, future agency competitor view.

---

## 9. The 3-layer found-flag waterfall in `runVisibilityScan` is intentional

`lib/ai-visibility-scan.ts:597–666` runs three detection passes in order, each more conservative than the last:

1. **Text matching** (`findMentionIndex`, `detectCitation`) — scans the response prose for brand domain, brand name (with first-word match for multi-word brands), and product tokens scraped from the brand's own page (`CX-90`, `iPhone15`).
2. **Citation fallback** — only fires if Layer 1 missed. Checks the structured `cited_urls[]` array for the brand domain. Found here → `prominence='low'`, `cited=true`. Conservative attribution: "engine retrieved you, even though it didn't say your name."
3. **Query-context fallback** — only fires if Layers 1 AND 2 both missed. If the prompt itself names the brand AND the response is substantive (≥50 words, no hedging) AND not focused on a competitor (TitleCase frequency guard), infer a hit at `prominence='low'`, `cited=false`. This catches Gemini training-data answers that respond on-topic without echoing the brand name.

Per-engine override exists for Perplexity (line 613–623): if Perplexity's structured citations disagree with Layer 1's regex result, citations win.

**Don't try to "fix" by:**
- Replacing the text-regex layers with "just check `cited_urls`" — re-introduces false negatives on Gemini training-data answers, brand-mentioned-by-name-only responses, and product-token-only responses (e.g. "the new CX-90 has...").
- Collapsing the layers into a single function for "simplicity."
- Removing the competitor-focused guard in Layer 3 — it stops crediting "Toyota recommended instead of Mazda" responses to Mazda.
- Using `cited_urls` to compute the brand's retrieval position when the row was credited via Layer 1 or Layer 3 — that pretends to give a number that wasn't actually measured. `citation_position` should be NULL when no URL evidence exists.

**Where:** `lib/ai-visibility-scan.ts:597–666` (the waterfall), `lib/ai-visibility-scan.ts:281` (`detectCitation`), commit `a11f298`.

---

## 10. When the brand's homepage is unreachable, brand-token resolution silently degrades

`fetchPageMetadata` in `lib/ai-visibility-scan.ts:154–177` catches *any* fetch error (timeout, 4xx/5xx, network refused, redirect loop) and returns `{ ogSiteName: null, ogTitle: null, title: null, productTokens: [], httpStatus: 0 }`. When that happens, `extractDomainTokens` falls all the way through to `slugFallback = hostname.split('.')[0]` — a single, lowercase, no-space token like `"volvocars"`.

This breaks **two** detection signals at once:

1. The **first-word pattern in `findMentionIndex`** never gets added (gated on `brandName.includes(' ')`) — so the LLM's natural form (`/\bVolvo\b/i`) doesn't match the response text.
2. The **Layer 3 `queryNamesBrand` gate** can't recognise the brand in prompts that use the spaced/proper form (e.g. "What are the best Volvo Cars models in 2025?" doesn't match `/\bvolvocars\b/i`).

Net result: every visibility query for that brand can return `found: false` even when the LLM's response is saturated with the brand. Confirmed live for `volvocars.com` (returns 403 to our crawler).

The current mitigation is `splitSlugBrand` (curated suffix list — splits "volvocars" → "Volvo Cars") plus the Layer 3 gate including the first word of multi-word brands. These are heuristics — they don't cover every brand. Slugs without a recognised business suffix (e.g. "honeywell", "cocacola") still fall through cleanly when the page is reachable but produce no detection when it isn't.

**Don't try to "fix" by:**
- Removing the catch in `fetchPageMetadata` and letting the error propagate — the scan must still run when the brand's site is blocked; the fallback layers exist for exactly that case.
- Auto-following redirects with longer timeouts to "guarantee" we get metadata — adds latency, doesn't fix the truly-blocked case.
- Aggressively expanding the slug-suffix list to common English words — false splits ("Honey Well") are worse than no split.
- Treating a `findMentionIndex` miss + empty `cited_urls` + Layer 3 gate failure as a Gemini-specific bug — it's the brand-resolution cascade for that scan.

**Where:** `lib/ai-visibility-scan.ts` `fetchPageMetadata`, `extractDomainTokens`, `splitSlugBrand`, the Layer 3 `queryNamesBrand` gate.

---

## 11. Gemini's grounding URIs are Vertex AI Search redirect wrappers, not publisher URLs

`chunk.web.uri` from `result.response.candidates[0].groundingMetadata.groundingChunks` returns URLs of the form:

```
https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF...
```

These are opaque Google-side redirect wrappers; the actual publisher URL is encoded in the path and only resolves when the redirect is followed. They will **never** contain the brand's root domain as a substring. Confirmed live across all Gemini scans.

Implications:
- **Layer 2 citation fallback can't match `cited_urls.includes(rootDomain)` for Gemini.** Use `chunk.web.title` instead (page titles often contain the brand name) — the current code does this in the Layer 2 path.
- **`citation_position` (PRODUCT_GUARDRAILS #9) is fundamentally NULL for Gemini rows.** We have no measurable rank against the brand domain because the URI list never contains it. This is honest semantics, not a bug.
- **`cited_urls` stored for Gemini is full of `vertexaisearch.cloud.google.com/...` strings.** Don't attempt to display these to users without resolving the redirect first — they're opaque and useless as user-facing source links.

**Don't try to "fix" by:**
- Using `chunk.web.uri` for `findCitationPosition` — it will always return null for Gemini, which is correct, but pretending otherwise (e.g., positional rank against the redirect URL) would fabricate signal.
- Following the redirects synchronously during a scan to resolve publisher URLs — adds an extra HTTP HEAD per chunk × 5 chunks × 5 prompts = 25 extra round-trips per scan. If we want this, scope it as a separate "rich sources" mode.
- Replacing the title-based Layer 2 fallback with regex on the redirect URL — the redirect URL has no semantic content matchable to a brand.

**Where:** `lib/ai-visibility-scan.ts` `queryGemini` (extracts both uri + title), Layer 2 of `runVisibilityScan` (uses titles as fallback signal), `lib/ai-visibility-scan.ts` `findCitationPosition` (intentionally returns null for Gemini).

---

## 12. Brand resolution must consult both page metadata AND the generated query set

`extractDomainTokens` picks a single primary brand token from `og:site_name → og:title → <title> → slug` (in that priority order). For sites with a parent/operating brand hierarchy (white-labelled services, holdings companies, products named differently from the parent), this is not enough — the operating entity's `og:site_name` can resolve to one brand (e.g. `"Express Global Employment"`) while LLMs consistently name the parent company (e.g. `"Acumen International"`).

To close the gap, the scanner also extracts brand-token candidates from the `visibilityQueries` generated by `/api/analyze` (which are produced by a Claude call that reads page title + content and picks whatever brand name appears most naturally). The extracted tokens are **additive** — they join `brandName` and `brandAlias`, never replace them.

The extraction in `extractBrandTokensFromQueries` applies three guards so competitors don't slip through:

1. **Position filter** — split each query on `vs / versus / compared to / alternative to / better than / instead of`; only count occurrences on the LEFT (brand) side.
2. **Frequency threshold** — phrase must appear in ≥ 3 queries' brand-side after the position filter. Single-occurrence competitors cannot clear this.
3. **Stop-phrase filter** — drop generic category terms (Employer of Record, Global Payroll, etc.) and de-dup against existing brand tokens.

If a longer phrase and its first word both clear the guards, only the longer form is kept (e.g. prefer `"Acumen International"` over standalone `"Acumen"`). `findMentionIndex` generates a first-word pattern automatically for any multi-word token.

**Don't try to "fix" by:**
- Replacing the `og:site_name → og:title → <title> → slug` resolution with "whatever the queries say" — loses signal from sites where page metadata IS accurate and queries happen to be generic.
- Dropping the frequency threshold below 3 — single-mention competitors in "vs X" queries will get promoted.
- Removing the position filter — competitors that appear on the right side of "vs" will be counted equal to the brand.
- Collapsing extraTokens into brandName — the primary `brandName` from metadata stays the canonical display form; extraTokens are detection-only.
- Skipping the extraction when `visibilityQueries` is missing or has fewer than 10 entries — graceful fallback to existing behaviour is the safe default (cache path, industry-default prompts).

**Where:** `lib/ai-visibility-scan.ts` `extractBrandTokensFromQueries`, `runVisibilityScan` (composes tokens), `findMentionIndex`, `analyzeVisibility`, Layer 2 title-fallback, Layer 3 `queryNamesBrand` gate, `isCompetitorFocusedResponse` (exclusion set now includes all brand tokens + their first words).

---

## 13. citation_gaps, citation_rate, and citation_data_quality are Perplexity-only, write-only, and reserved for Phase 3

These columns on the `analyses` table have no live UI consumer. They are written by `/api/ai-visibility-scan` but never read by any user-facing path today.

**Why Perplexity-only:** see #6 (ChatGPT no `cited_urls` on Tiers 2/3), #9 (`citation_position` NULL for Layer 1/3 credits), #11 (Gemini Vertex redirect wrappers).

**Why not touched:** writeback skipped on cache hits and Perplexity errors. Consumer UI is Phase 3 agency work.

**Don't try to "fix" by:**
- Removing these columns — they are reserved for Phase 3 agency competitor views
- Extending the writeback to ChatGPT or Gemini engines — the upstream data is not comparable (see cross-references above)
- Reading these columns in the share page, PDF, or results page — all user-facing paths derive citation data from `ai_visibility_results` directly via `getLatestVisibilityScanAnyAge()` and `computeCitationStats()`

**Where:** `app/api/ai-visibility-scan/route.ts:192–244` (writeback), `lib/db.ts:846–868` (`updateAnalysisCitationData`). See `ROADMAP.md` Phase 3 and `CLAUDE.md` Known Gaps for build context.

---

## 14. Cache path security (`?cached=true`)

The `?cached=true` early return in `app/api/analyze/route.ts` bypasses the burst rate limiter but NOT the auth gate or monthly limit. This is intentional and secure:

- Auth gate (line 53) runs before the cache block — unauthenticated requests never reach it
- Cache lookup is scoped to `subscription.userId` (server-verified Clerk identity) — a user can only retrieve their own results
- Monthly 403 limit is not bypassed — cache only returns already-saved results at no cost; stale/missing cache falls through to the `canAnalyze` check normally

**Don't try to "fix" by:**
- Reordering the auth gate below the cache block
- Allowing `userId` to be supplied from the request body
- Moving the cache check outside the authenticated code path as a "performance optimisation"

**Where:** `app/api/analyze/route.ts` — auth gate line 53, cache block starting line 98, `canAnalyze` check at line 232.
