# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LLM Check** (llmcheck.app) is a production SaaS application that scores how well a website is cited and recognised by AI/LLM systems (ChatGPT, Gemini, Perplexity). It produces a **Weighted Visibility Score (WVS)** 0–100 plus actionable recommendations. It has paying customers and generates revenue through Stripe subscriptions.

- **Stack**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Authentication**: Clerk (with metadata-based user limits) + Svix webhook verification
- **Payments**: Stripe (webhooks for subscription management)
- **Database**: Vercel Postgres (analysis history, visibility scans, share links)
- **Audit scoring**: **Claude** via `@anthropic-ai/sdk` — primary per-analysis cost
- **Visibility scan**: OpenAI (`gpt-4o`, `gpt-4o-search-preview`), Google (`gemini-2.5-flash`), Perplexity (`sonar`)
- **Email**: Resend + React Email
- **PDF Generation**: Puppeteer (resource-intensive)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Chrome Extension**: live on Web Store, ID `ajcjkkbebpgofanpddihbkilmcnjddad`

## Navigation
- Operational rules: CLAUDE.md (this file)
- Product constraints: PRODUCT_GUARDRAILS.md
- Roadmap & phases: ROADMAP.md
- Active feature plans: docs/plans/active/
- Before starting any feature, read its plan file if one exists
- .claude/instructions.md — read before any commit, branch, or push operation

## SOP — Product Update / Feature Build Loop

**Mandatory checklist for every change.** Read `PRODUCT_GUARDRAILS.md` once at the start of every session and again whenever a request smells like "fix" or "improve" existing behaviour.

### Before writing any code
1. **Read `PRODUCT_GUARDRAILS.md`.** If the change touches anything documented there as a fundamental constraint, STOP and surface it to the user instead of "fixing" it silently.
2. **Read the relevant existing code end-to-end.** Trace the data path before proposing changes. Don't guess at structure or behaviour. (Diagnosis rule: never state cause without tracing — `feedback_no_guessing` memory.)
3. **Check Known Gaps** below in this file. If the change relates to an open gap, reference its row.
4. **For non-trivial changes (>~30 lines or any cross-file refactor):** propose the approach + tradeoffs + open questions BEFORE coding. Get user buy-in. Don't disappear into 500 lines.
5. **For risky changes** (Stripe / Clerk / CSP / OG image / scoring weights): confirm the deploy strategy (preview branch vs direct to main) before pushing.

### While coding
6. **Server-side auth + premium checks always.** Never trust client. Use `lib/auth-utils.ts` helpers; admin routes use `checkAdminStatus()`.
7. **Every new LLM call gets `logLlmSpend()`** from `lib/llm-spend.ts`. Fire-and-forget; never await with concern.
8. **Every new LLM-spend-critical endpoint gets a rate-limit check** via `lib/rate-limit.ts` and returns 429 with `Retry-After`.
9. **Every UI change considers all tier render paths**: guest / free / premium / agency. Test each.
10. **All DB access through `lib/db.ts`.** Add new queries there, not inline in routes.
11. **Display-only changes** (share / PDF / OG): respect the visibility-first rule — citation data leads, structural score is supporting.

### Before commit
12. **`npm run build` must pass.** Then `npx tsc --noEmit` for type safety.
13. **Test against the actual user paths** affected — don't just trust the build.
14. **Commit per logical change.** Clear `<type>: <summary>` messages, no Co-Authored-By line.

### Before push
15. **Hold pushes until the user explicitly says "push"** (memory rule). Local commits are fine.
16. **For risky changes, push to a preview branch first.** Verify on the Vercel preview before merging to main.

### After ship
17. **Update `CLAUDE.md`** if behaviour, file paths, rules, or roadmap state changed.
18. **Update `PRODUCT_GUARDRAILS.md`** if the change exposed a new constraint that future sessions might mistake for a bug.
19. **Update Known Gaps** if the work resolved a P0/P1/P2 item.

## Development Commands

```bash
# Install dependencies (includes Puppeteer Chrome installation)
npm install

# Development server
npm run dev

# Build for production (MUST pass before committing)
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Start production server
npm start
```

## Critical Architecture Patterns

### Analysis Flow
1. User submits URL via `/app/page.tsx` (form). If not signed in, the UI opens Clerk sign-in and queues the URL in sessionStorage; the request resumes post-signin. `/api/analyze` is not reachable without a Clerk session — the route returns 401 on unauthenticated requests.
2. POST to `/app/api/analyze/route.ts`:
   - Hard auth gate: returns 401 if `!subscription.isAuthenticated`
   - Checks user limits via Clerk metadata (`getUserSubscription()`)
   - Rate-limited via Upstash (see `lib/rate-limit.ts`)
   - Fetches page, detects `page_blocked` (HTTP 401/403 or refused) → `fetchStatus`
   - Parses website with Cheerio; extracts v2 signals (schema types, question headings, FAQ, comparison markers)
   - Sends to **Claude** for v2 scoring + recommendations + query buckets
   - Updates analysis count in Clerk metadata
   - Saves result to Vercel Postgres with `scoring_version='v2'`
   - Returns structured results (includes `page_blocked`, `httpStatus` when relevant)
3. Navigate to `/app/results/page.tsx`
4. Display results based on user tier (free/premium/agency)

### AI Visibility Scan Flow (`/app/api/ai-visibility-scan/route.ts`)
1. **Premium-only** (403 otherwise)
2. **72-hour cache** — returns existing scan if < 72h old
3. `runVisibilityScan()` fires 5 prompts × 3 LLMs = 15 data points
4. Extracts per-result: `found`, `snippet`, `prominence`, `sentiment`, `cited`, `cited_urls`, `mentioned_brands`, `score`
5. Writes back to `analyses`: `citation_rate`, `citation_gaps`, `citation_data_quality`
6. Returns results + historical `ModelTrendPoint[]`

### Subscription & Premium Feature Flow
1. User visits `/app/pricing/page.tsx` (Clerk PricingTable — copy configured in Clerk dashboard)
2. Checkout via Stripe
3. Webhook → `/app/api/webhooks/Stripe/route.ts`:
   - Verifies webhook signature
   - `checkout.session.completed` → `premiumUser=true` + welcome email via Resend
   - `customer.subscription.updated` → update status
   - `customer.subscription.deleted` → `premiumUser=false`
4. Clerk webhook → `/app/api/webhooks/clerk/route.js`:
   - Sets `privateMetadata.plan='llm_check_premium'` when plan active
5. Premium status checked server-side via `/api/subscription-status`
6. Subscription management via Stripe billing portal

### User Limits & Tiers (`ANALYSIS_LIMITS` in `lib/auth-utils.ts`)
- **Guests**: cannot analyze. `/api/analyze` returns 401 `Sign in required`. UI opens Clerk sign-in before any analyze request is made; `pendingURL`/`pendingEmail` are persisted through sessionStorage and resumed post-signin.
- **Free signed-in**: limited analyses/month (Clerk metadata), 3 free parameters only, no visibility scan
- **Premium**: unlimited analyses, all 6 parameters, visibility scan, history, PDF, email reports, Chrome extension
- **Agency**: higher limits than Premium (see `ANALYSIS_LIMITS.AGENCY`)
- Limits stored in Clerk `publicMetadata`: `analysisCount`, `lastAnalysisReset`, `premiumUser`

### Query Bucket Taxonomy (20 queries per analysis, 5 per bucket)
- `brand` — queries naming the brand/site
- `problem` — queries describing the problem the product solves
- `category` — queries about the product/service category
- `comparison` — queries comparing against alternatives

### Chrome Extension Auth
- Sign-in: `app/auth/page.tsx` · Sign-up: `app/sign-up/page.tsx`
- Bearer token verified against extension ID `ajcjkkbebpgofanpddihbkilmcnjddad`
- Status endpoint: `GET /api/extension-subscription-status`

### Analysis History (Premium Feature)
- Saved to Vercel Postgres table `analyses`
- URL normalization ensures consistent tracking (see `lib/db.ts`)
- Retrieved via `/app/api/analysis-history/route.ts`
- Displayed in `components/score-history-widget.tsx` on results page
- Chart renders an amber `ReferenceLine` at first v2 data point marking the v1→v2 scoring boundary

## Scoring: v2 Parameters (current)

v1 (open-ended parameters) → **v2 (6 fixed weighted parameters)**. `analyses.scoring_version` marks the boundary.

| Parameter | Slug | Weight | Premium-only |
|---|---|---|---|
| Answer-Ready Content | `answer_ready_content` | 25% | No |
| Brand & Expertise Clarity | `brand_expertise_clarity` | 20% | No |
| Structured Data Depth | `structured_data_depth` | 20% | No |
| Citable Content Quality | `citable_content_quality` | 15% | Yes |
| E-E-A-T & Authority Signals | `eeat_authority_signals` | 10% | Yes |
| Comparison & Intent Coverage | `intent_coverage_breadth` | 10% | Yes |

`overall_score` is computed **server-side** as the weighted average, overriding any value Claude returns.

**Scoring scale** (apply conservatively — 100 is rare):
```
0  = completely absent or broken
25 = present but ineffective
50 = functional but below best practice
75 = good, meets most best practice criteria
100 = exceptional, genuinely best-in-class
```

## File Structure & Responsibilities

### 🔴 CRITICAL - Revenue/Security/Core Business Logic
**Never modify without thorough understanding and testing:**

- `/app/api/analyze/route.ts` - Core analysis engine (Claude integration, costs money per request)
- `/app/api/ai-visibility-scan/route.ts` - Multi-LLM visibility scan (premium-only, 15 calls per scan)
- `/app/api/webhooks/Stripe/route.ts` - Payment processing (activates/revokes premium)
- `/app/api/webhooks/clerk/route.js` - Clerk user lifecycle webhooks (plan gating)
- `/middleware.ts` - Route protection (Clerk authentication)
- `/next.config.mjs` - CSP security headers (Clerk, Stripe, AdSense integration)
- `/lib/auth-utils.ts` - `checkPremiumStatus()`, `validatePremiumAccess()`, `ANALYSIS_LIMITS`
- `/lib/db.ts` - URL normalization, all queries

### 🟡 IMPORTANT - Understand Before Changing

- `/app/page.tsx` - Homepage with analysis form
- `/app/results/page.tsx` - Results display with tier-based features
- `/app/ai-visibility/page.tsx` - AI visibility analysis page
- `/app/share/[slug]/page.tsx` + `opengraph-image.tsx` - Public share page + dynamic OG
- `/app/api/subscription-status/route.ts` - Server-side premium verification
- `/app/api/subscription/route.js` - Stripe billing portal integration
- `/app/api/share/create|revoke|email/route.ts` - Share link lifecycle + email delivery
- `/lib/ai-visibility-scan.ts` - Multi-LLM orchestration, found/citation waterfall
- `/lib/stripe-utils.ts` - Stripe customer/subscription lookup
- `/components/navbar.tsx` - Auth state and navigation
- `/app/pricing/page.tsx` - Clerk PricingTable integration
- `/og.config.ts` - OG image configuration per page

### 🟢 SAFE - Standard Development

- `/components/ui/*` - shadcn/ui components
- `/components/score-gauge.tsx`, `/components/parameter-score-card.tsx`, `/components/recommendation-card.tsx`
- `/components/share-button.tsx`, `/components/email-report-dialog.tsx`
- `/components/ai-visibility-check.tsx`, `/components/score-history-widget.tsx`
- `/components/screenshot-carousel.tsx`
- `/app/guide/page.tsx`, `/app/methodology/page.tsx`, `/app/contact/page.tsx`
- `/app/terms/*`, `/app/privacy/*` - Legal pages
- `/app/og/route.tsx`, `/lib/og-image.tsx` - OG image rendering
- `/emails/*` - Email templates (React Email)
- `/components/footer.tsx` - Site footer
- Styling/CSS changes

## Environment Variables

```bash
# Clerk (auth-critical)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe (payment-critical)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Email
RESEND_API_KEY=re_...

# AI providers (cost-critical — every analysis costs API fees)
ANTHROPIC_API_KEY=sk-ant-...    # Claude — audit scoring (primary $ per analysis)
OPENAI_API_KEY=sk-...           # ChatGPT — visibility scan
GOOGLE_API_KEY=...              # Gemini — visibility scan
PERPLEXITY_API_KEY=pplx-...     # Perplexity — visibility scan

# Admin
ADMIN_SECRET=...                # Guards one-shot migration endpoints

# Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Vercel Postgres (analysis history)
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
POSTGRES_HOST=

# App Config
NEXT_PUBLIC_APP_URL=https://llmcheck.app
```

**Never hardcode these values. Always use `process.env`.**

## Key Technical Constraints

### Cost Considerations
- Audit: each `/api/analyze` call hits Claude (`ANTHROPIC_API_KEY`) — primary per-analysis spend
- Visibility scan: each `/api/ai-visibility-scan` call fires 15 LLM requests (OpenAI + Gemini + Perplexity × 5 prompts)
- **72-hour cache** on both analyses and visibility scans reduces repeat-URL spend
- Puppeteer PDF generation is resource-intensive and may timeout on serverless

### Security Requirements
- All premium checks MUST happen server-side (never trust client)
- Stripe webhook signatures MUST be verified
- Clerk webhook signatures verified via Svix
- Clerk metadata stores subscription status and user limits
- Admin routes MUST check `publicMetadata.isAdmin === true` — not just `!!userId`
- CSP headers are tightly configured - changes may break integrations

### Monetization Logic
- Google AdSense ads shown ONLY to free users (with content validation)
- Premium subscriptions (via Stripe) remove ads and unlock: visibility scan, history, PDF, email reports, Chrome extension
- Agency tier provides higher limits (product surface still thin — see roadmap)
- Free user limits enforced via Clerk metadata (can be manipulated theoretically)

## Database Schema

### `analyses`
```sql
id, user_id, url, normalized_url,
overall_score, parameters JSONB, recommendations JSONB, query_buckets JSONB,
scoring_version VARCHAR,                   -- 'v1' | 'v2'
citation_results JSONB, citation_rate FLOAT,
citation_gaps JSONB, citation_data_quality VARCHAR(20),
analyzed_at, share_slug, share_expires_at, created_at
```

### `ai_visibility_scans`
```sql
id, normalized_url, industry, total_found, total_queries, created_at
```

### `ai_visibility_results`
```sql
id, scan_id, model, prompt, query_type,
found, snippet, prominence VARCHAR(10), sentiment NUMERIC(4,3),
cited BOOLEAN, cited_urls JSONB, citation_position INTEGER,
mentioned_brands JSONB, score INTEGER
```
- `citation_position` is the brand's 1-based rank in the engine's structured `cited_urls` array. NULL when no URL evidence exists (Layer 1 text-match credit or Layer 3 query-context credit). See `PRODUCT_GUARDRAILS.md` #9.

### Other tables
`guest_emails`, `visibility_waitlist`, `exit_survey_responses`

Access via `lib/db.ts` functions: `saveAnalysis()`, `getAnalysisHistory()`, `normalizeUrl()`, etc. Migrations in `db/migrations/*.sql`.

## Common Modifications

### Adding a New Analysis Parameter
1. Update `/app/api/analyze/route.ts`:
   - Extract new parameter from website
   - Add to Claude prompt
   - Include in response structure
2. Update `/app/results/page.tsx` to display new parameter
3. Test scoring still works correctly

### Creating a New Premium Feature
1. Add feature to `/app/results/page.tsx` (or new page)
2. Add server-side premium check:
   ```typescript
   const response = await fetch('/api/subscription-status');
   const { isPremium } = await response.json();
   if (!isPremium) return <UpgradePrompt />;
   ```
3. Update `/app/pricing/page.tsx` to list new benefit
4. Test with both free and premium accounts

### Modifying User Limits
1. Update limit constants in `/lib/auth-utils.ts` (`ANALYSIS_LIMITS`)
2. Update display in navbar/pricing page
3. Test limit enforcement thoroughly with all user types

## Testing Checklist

Before pushing changes, verify:

**Core Functionality:**
- [ ] Website analysis completes successfully (Claude returns valid scores)
- [ ] AI Visibility scan returns data from all three providers
- [ ] Results page displays all parameters correctly
- [ ] Page-blocked flow shows amber banner, hides score ring

**Authentication & Limits:**
- [ ] Guest users can do 1 analysis (localStorage)
- [ ] Free signed-in users hit the monthly limit correctly
- [ ] Premium users have unlimited analyses
- [ ] Agency users get the elevated limit
- [ ] Analysis counts increment correctly

**Subscription & Payments:**
- [ ] Stripe checkout flow completes
- [ ] Welcome email fires on `checkout.session.completed`
- [ ] Webhooks update premium status correctly
- [ ] Premium features unlock after payment
- [ ] Billing portal loads correctly

**Monetization:**
- [ ] Ads display for free users only
- [ ] Ads never display for premium users
- [ ] Premium upgrade prompts show correctly

**Build & Type Safety:**
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` passes
- [ ] No console errors in browser

## Red Flags - Stop Immediately If:

1. **Subscription status checked only client-side** → Must be server-side
2. **Webhook signature verification removed** → Payment security breach
3. **Free user limits not enforced** → Revenue loss
4. **Any LLM API key exposed client-side** → Security breach + cost abuse
5. **Analysis endpoint accessible without limits** → Cost abuse vulnerability
6. **Premium features available without auth check** → Revenue loss
7. **Admin routes gated only by `!!userId`** → PII leak / queue manipulation
8. **Scoring weights or server-side `overall_score` override removed** → Inaccurate results

## Rules for Claude Code

- All DB access goes through `lib/db.ts` — add new queries there, not inline in routes
- Auth pattern: always use `checkPremiumStatus()` or `getUserSubscription()` from `lib/auth-utils.ts`
- Admin routes must check `isAdmin` in Clerk `publicMetadata`, not just `!!userId`
- Premium gates return HTTP 403 with `{ error: 'Premium subscription required' }`
- Cache TTL is 72 hours for both analysis and AI visibility scans
- `analyses.share_slug` is for public share pages — never expose `user_id` in public routes
- Resend sender is always `LLM Check <analysis@llmcheck.app>`
- When downstream state sync fails in a webhook (e.g. Clerk metadata update), **return 500** so Stripe retries natively — and call `alertWebhookFailure()` from `lib/alerts.ts` so failures are visible. Do not swallow errors to force 200.
- Score history widget marks the v1→v2 scoring boundary with an amber label — preserve this behaviour
- `getPrimaryCompetitor(gap)` is in `lib/types.ts` — use it wherever you need the top competing domain from a citation gap
- `lib/track-event.ts` should be called for meaningful user actions (scan started, upgrade clicked, etc.)
- Rate limits live in `lib/rate-limit.ts` (Upstash Redis). Any new LLM-spend-critical endpoint MUST add a limiter and return 429 with a `Retry-After` header when exceeded. Limiters fail open if Upstash is down and send an alert via `lib/alerts.ts`.
- **Every outbound LLM call MUST log spend** via `logLlmSpend()` in `lib/llm-spend.ts` right after the call returns. Fire-and-forget — `void logLlmSpend({...})` pattern. Never await with concern for errors; the helper catches its own DB failures. The pricing table inside `lib/llm-spend.ts` needs a row per model — if a new model is added, update `PRICING`, otherwise cost defaults to 0 with a console warning. The `llm_spend` table (migration `db/migrations/005_llm_spend.sql`) is read-only logging for now; budget enforcement via `getUserSpendTotal()` is a future step.
- **Shared / printable reports lead with AI Visibility**, not the structural AI Readiness score. The share page (`app/share/[slug]/page.tsx`) and PDF route (`app/api/generate-pdf/route.ts`) both compute their hero from `ai_visibility_results` via `getLatestVisibilityScanAnyAge()` in `lib/db.ts` and `computeCitationStats()` / `computeVerdict()` in `lib/visibility-report.ts`. The structural score (`overall_score`) appears below the fold as a supporting section, never the headline. Supporting-section heading is **conditional on citation rate**: `≥60%` → "How to extend your visibility further"; `<60%` → "Why your score could be even higher". Verdict thresholds from citation rate: ≥80 Strong, 60–79 At Risk, 40–59 Low, <40 Critical: Not Cited. Parameter cards in shared/printable reports show each parameter's weighted point contribution (e.g. `12 / 20 pts`) via `computeParamContribution()`, so the six cards sum visually to the overall score. When no scan data exists (pre-scan analyses), both paths fall back to the structural-led layout with an amber banner prompting re-analysis. The on-screen `/results` page already handles this correctly — do not touch it.

## Git Commit Guidelines

This is production code with paying customers. Use clear commit messages:

**Format:**
```
<type>: <short summary (50 chars max)>

<detailed explanation of what and why>

- Bullet points for significant changes
- Include file paths for context
- Note any breaking changes
```

**Types:** `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `perf`, `security`, `revert`

**Before committing:**
1. Run `npm run build` (must succeed)
2. Check TypeScript compiles (`npx tsc --noEmit`)
3. Test changes locally
4. Never commit `.env` files

## Production Safety

**This is a LIVE application with:**
- Active revenue stream (Stripe subscriptions)
- Real costs per analysis (Claude API + visibility scan providers)
- Paying customers expecting reliable service
- Security requirements (payment processing)

**When uncertain:**
- Read the code first - understand before changing
- Ask questions - better to clarify than to break
- Test thoroughly - especially auth, payments, and limits
- Preserve revenue streams - don't break subscriptions or premium features
- Control costs - be mindful of LLM API usage across all four providers

**Primary directive:** Ensure paying premium customers continue to receive the service they're paying for, and free users don't exceed their limits.

---

## 🔧 Known Gaps (Prioritized)

Live list of open technical debt. Severity reflects ops/revenue impact, not effort.

### P0 — fix soon (security / revenue / data loss risk)

| Gap | Where | Why it matters |
|---|---|---|
| No error monitoring | — | Production app with paying customers — failures surface only via customer complaints or `console.error`. Ship Sentry (or equivalent) before anything else. |
| No budget caps on LLM spend | — | Per-call logging to `llm_spend` is now live (step 1 shipped). Step 2 — per-user / per-tier budget caps with pre-call rejection — is still open; a compromised account can burn through real money until caps land. Blocked on: baseline data (wait for ~1–2 weeks of logs before setting caps). |

### P1 — important (reliability / quality)

| Gap | Where | Why it matters |
|---|---|---|
| Free-user limit lives in Clerk `publicMetadata` | `lib/auth-utils.ts` | Theoretically manipulable; for authed users, Postgres would be harder to spoof. |
| No structured logging | `lib/ai-visibility-scan.ts` et al | `console.log` everywhere — not queryable at scale. |
| Puppeteer PDF timeout risk on serverless | `/api/generate-pdf` | Premium feature can silently fail; no fallback path. |
| CSP fragile coupling | `next.config.mjs` | One bad header change breaks Clerk/Stripe/AdSense integration. |
| `mentioned_brands` not normalised across LLMs | scan pipeline | **Phase 3 blocker** — same brand under multiple casings will undermine agency competitor-tracking views. Fix before that feature ships, not after. |

### P2 — cleanup / polish / later

| Gap | Where | Why it matters |
|---|---|---|
| No test suite | — | Real gap, deferred. Build/type-check + manual QA acceptable at current scale. Revisit when revenue or team size justifies it. |
| Stale backup files | `app/page-backup.tsx`, `app/results/page-backedup.tsx` | Dead code; remove. |
| `TEMPORARY DEBUG` logs | `app/api/extension-subscription-status/route.js` | Flagged for removal. |
| `og:logo` meta tag missing | `app/layout.tsx` | OG validator flags; logo asset TBD. |
| Randomised OG variants parked | — | Root cause of prod failure unknown; current static OG is stable. |
| `analyses` + `ai_visibility_results` grow unbounded | DB | No TTL / archival strategy yet. |
| Stale "GPT-4o as scorer" references | `.claude/instructions.md` and older comments | Audit engine is now Claude — sweep and update. |
| Share page over-triggers pre-scan fallback banner | `app/share/[slug]/page.tsx:206` | Fallback fires whenever `analysis.citation_gaps` is empty, even when `ai_visibility_results` has real scan data. Happens when Perplexity errored on all 5 queries (Sonar hiccup, timeout) — ChatGPT/Gemini data is present but `citation_gaps` never got written, so the share banner incorrectly says "generated before AI citation scanning was available". **Fix is one line**: change `usesFallback = !hasScan \|\| citationGaps.length === 0` → `usesFallback = !hasScan`. The new share-page primary path reads from `scan.results` directly and doesn't need `citation_gaps`. **Monitoring frequency before shipping** — may graduate to P1 if it turns out to affect a meaningful share of reports. |