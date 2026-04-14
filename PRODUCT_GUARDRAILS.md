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
