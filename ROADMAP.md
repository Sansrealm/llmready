# Roadmap

Live doc — edit freely as phases evolve.
Sequential: don't start next phase until current is stable.

## Phase 1 — Ops stability ✅ SHIPPED (Apr 13 2026)
Admin auth gated on `isAdmin`, Upstash rate limiting on `/api/analyze` + `/api/ai-visibility-scan`, webhook retry replaced with Stripe-native + alerting, one-shot migration endpoints removed, `/api/analyze` auth-walled, LLM spend logging to `llm_spend` table, sonner Toaster mounted in `app/layout.tsx`.

## Phase 2 — Report upgrade ✅ SHIPPED (Apr 13 2026)
Share page, PDF, and OG image all lead with AI Visibility citation data. Parameter cards show weighted point contributions (X/Y pts). Conditional support heading based on citation rate. Structural score appears below the fold as supporting section.

## Phase 3 — Agency UX ← current
Improve views and reports for agency-tier subscribers. Starting point is existing scan history. Likely scope: better multi-domain report views, cleaner exportable reports, improved dashboard for agencies managing multiple clients. Includes competitor comparison view — primitives exist (`mentioned_brands`, `citation_gaps`, `getPrimaryCompetitor()`).

⚠️ **Blocked on** fixing `mentioned_brands` cross-LLM normalisation (P1 gap) — ship that before this phase or the feature inherits dirty data.
User management (seats, client access) is out of scope for now.

**Pre-requisite: test coverage on `lib/ai-visibility-scan.ts`.**
Most-modified, most-complex file in the codebase (3-layer detection waterfall, brand resolution, query-derived tokens, Gemini title fallback, slug splitting). 4 changes landed in the Apr 13–16 window with zero automated regression coverage. Add tests before shipping Phase 3 features on top of this module.

## Scaffolded but un-shipped — "Fix this" generator
Backend endpoint `app/api/generate-fix/route.js` exists and is fully working (OpenAI `gpt-4o`, 5 fix types: `title-tag`, `meta-description`, `schema-markup`, `internal-links`, `content-improvement`, returns confidence score). **No frontend caller.** Intended UX:
- **Audience:** premium + agency only
- **Trigger:** per low-scoring structural parameter (Answer-Ready Content, Brand & Expertise Clarity, Structured Data Depth, Citable Content Quality, E-E-A-T, Intent Coverage). Button appears only on cards scoring below a threshold.
- **Flow:** one-shot generation, copy-to-clipboard pattern, no direct third-party integration (no Webflow / WordPress / CMS APIs). User copies the generated text and applies it to their own site.
- **Pairs with multi-URL analysis:** more valuable once users can add multiple URLs per domain (blog posts, product pages, /faq, etc.) — gives them per-page fixes at scale.
- **Constraint:** UI must be intuitive and must NOT clutter the existing results-page experience. Probably an inline drawer / expandable section on the card rather than a new page or modal-heavy flow.
- **Cost guard:** rate-limit + spend cap tie-in (step 2 of `lib/llm-spend.ts` work). Per-fix cost is ~$0.01–0.02.
- **Do NOT delete the endpoint** — this is a planned feature awaiting UI, not dead code.

## Watchlist — awaiting corroboration before action

Items where we have a credible signal but not enough confidence to act on yet. Revisit when additional data arrives.

**v3 scoring update — AirOps / Kevin Indig fan-out study (April 2026)**
- Source: `docs/research/airops-fan-out-2026.md`. Single report. 16,851 queries, ChatGPT-only, UI-scraped.
- **Validates v2:** `structured_data_depth` (+6.5pp independent citation lift; top types — FAQPage, BreadcrumbList, Organization — match our rubric).
- **Contradicts v2:**
  - `eeat_authority_signals` — DA not correlated (slightly inverse). Author-credentials component not tested in isolation, so not fully invalidated.
  - `intent_coverage_breadth` naming — research finds breadth on a single page *hurts* (focused pages beat "ultimate guides"). Our parameter is about site-wide intent coverage which is a different axis, but the name misleads.
  - `answer_ready_content` rubric — rewards "comprehensive" FAQs; research says focus beats comprehensive.
- **Dimensions we don't measure that the study flagged as load-bearing:**
  - Heading-query match (**41% vs 29%** citation rate — largest on-page lever in the study)
  - Word count sweet spot (500–2,000; 5,000+ underperforms sub-500)
  - Readability (Flesch-Kincaid grade 16–17 optimal)
  - Retrieval rank (already captured per-scan via `citation_position` from commit `d82eb7c`; not in structural score)
- **Why we're holding:** single source, ChatGPT-only, observational (not causal). Retrieval-rank and DA findings may not generalise to Gemini / Perplexity.
- **What we need before acting:**
  - A second independent source corroborating or contradicting any of these findings, OR
  - Enough own-scan data (via `llm_spend` + `ai_visibility_results` over time) to test the heading-match and word-count hypotheses against our own citation outcomes.
- **If we do act:** proposed path is Option A — rename 2 parameters, drop `eeat_authority_signals` (fold "specificity of sourcing" into a renamed Content Substance), add Heading-Query Match as new parameter, inject word-count + FK-grade extraction. Full plan is in the conversation history; regenerate on demand.
- **Do NOT act on this alone.** Single-source scoring rewrites are how we'd end up miscalibrating the system.
