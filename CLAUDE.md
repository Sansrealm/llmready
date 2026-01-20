# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LLM Check** is a production SaaS application that analyzes websites for AI/LLM readiness and provides SEO insights. It has paying customers and generates revenue through Stripe subscriptions.

- **Stack**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Authentication**: Clerk (with metadata-based user limits)
- **Payments**: Stripe (webhooks for subscription management)
- **Database**: Vercel Postgres (analysis history tracking)
- **AI**: OpenAI GPT-4o (website analysis engine)
- **PDF Generation**: Puppeteer (resource-intensive)
- **UI Components**: shadcn/ui with Radix UI primitives

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

# Start production server
npm start
```

## Critical Architecture Patterns

### Analysis Flow
1. User submits URL via `/app/page.tsx` (form)
2. POST to `/app/api/analyze/route.js`:
   - Checks user auth & limits via Clerk metadata
   - Fetches and parses website with Cheerio
   - Sends to OpenAI GPT-4o (costs money per request)
   - Updates analysis count in Clerk metadata
   - Saves result to Vercel Postgres (if user is authenticated)
   - Returns structured analysis results
3. Navigate to `/app/results/page.tsx`
4. Display results based on user tier (guest/free/premium)

### Subscription & Premium Feature Flow
1. User visits `/app/pricing/page.tsx` (Clerk PricingTable)
2. Checkout via Stripe
3. Webhook → `/app/api/webhooks/Stripe/route.js`:
   - Verifies webhook signature with Stripe
   - Updates Clerk metadata: `subscriptionStatus = 'active'`
4. Premium status checked server-side via `/app/api/subscription-status/route.js`
5. Subscription management via Stripe billing portal

### User Limits Enforcement
- **Guests**: 1 analysis (localStorage-based)
- **Free signed-in**: 3 analyses/month (Clerk metadata)
- **Premium**: Unlimited analyses
- Limits stored in Clerk `publicMetadata`: `analysisCount`, `lastAnalysisReset`, `subscriptionStatus`

### Analysis History (Premium Feature)
- Saved to Vercel Postgres table `analyses`
- URL normalization ensures consistent tracking (see `lib/db.ts`)
- Retrieved via `/app/api/analysis-history/route.ts`
- Displayed in `components/score-history-widget.tsx` on results page

## File Structure & Responsibilities

### 🔴 CRITICAL - Revenue/Security/Core Business Logic
**Never modify without thorough understanding and testing:**

- `/app/api/analyze/route.js` - Core analysis engine (OpenAI integration, costs money per request)
- `/app/api/webhooks/Stripe/route.js` - Payment processing (activates/revokes premium)
- `/middleware.ts` - Route protection (Clerk authentication)
- `/next.config.mjs` - CSP security headers (Clerk, Stripe, AdSense integration)

### 🟡 IMPORTANT - Understand Before Changing

- `/app/results/page.tsx` - Results display with tier-based features
- `/app/api/subscription-status/route.js` - Server-side premium verification
- `/app/api/subscription/route.js` - Stripe billing portal integration
- `/components/navbar.tsx` - Auth state and navigation
- `/app/pricing/page.tsx` - Clerk PricingTable integration
- `/lib/db.ts` - Database utilities (URL normalization, analysis saving)

### 🟢 SAFE - Standard Development

- `/components/ui/*` - shadcn/ui components
- `/app/guide/page.tsx` - Educational content
- `/app/terms/*`, `/app/privacy/*` - Legal pages
- `/components/footer.tsx` - Site footer
- Styling/CSS changes

## Environment Variables

```bash
# OpenAI (cost-critical - every analysis costs API fees)
OPENAI_API_KEY=sk-...

# Stripe (payment-critical)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Clerk (auth-critical)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Vercel Postgres (analysis history)
POSTGRES_URL=postgresql://...

# App Config
NEXT_PUBLIC_APP_URL=https://llmcheck.com
```

**Never hardcode these values. Always use `process.env`.**

## Key Technical Constraints

### Cost Considerations
- Every analysis costs OpenAI API fees (GPT-4o tokens)
- No caching implemented - repeated analyses cost full price
- Puppeteer PDF generation is resource-intensive and may timeout

### Security Requirements
- All premium checks MUST happen server-side (never trust client)
- Stripe webhook signatures MUST be verified
- Clerk metadata stores subscription status and user limits
- CSP headers are tightly configured - changes may break integrations

### Monetization Logic
- Google AdSense ads shown ONLY to free users (with content validation)
- Premium users ($9/month) get: unlimited analyses, no ads, analysis history
- Free user limits enforced via Clerk metadata (can be manipulated theoretically)

## Database Schema

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  normalized_url VARCHAR(2048) NOT NULL, -- https, lowercase, no trailing slash
  overall_score INTEGER CHECK (0-100),
  parameters JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_id, normalized_url, and combined user_url queries
```

Access via `lib/db.ts` functions: `saveAnalysis()`, `getAnalysisHistory()`, `normalizeUrl()`

## Common Modifications

### Adding a New Analysis Parameter
1. Update `/app/api/analyze/route.js`:
   - Extract new parameter from website
   - Add to OpenAI prompt
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
1. Update limit constants in `/app/api/analyze/route.js`
2. Update display in navbar/pricing page
3. Test limit enforcement thoroughly with all user types

## Testing Checklist

Before pushing changes, verify:

**Core Functionality:**
- [ ] Website analysis completes successfully
- [ ] OpenAI integration returns valid scores
- [ ] Results page displays all parameters correctly

**Authentication & Limits:**
- [ ] Guest users can do 1 analysis (localStorage)
- [ ] Free signed-in users can do 3 analyses/month
- [ ] Premium users have unlimited analyses
- [ ] Analysis counts increment correctly

**Subscription & Payments:**
- [ ] Stripe checkout flow completes
- [ ] Webhooks update premium status correctly
- [ ] Premium features unlock after payment
- [ ] Billing portal loads correctly

**Monetization:**
- [ ] Ads display for free users only
- [ ] Ads never display for premium users
- [ ] Premium upgrade prompts show correctly

**Build & Type Safety:**
- [ ] `npm run build` succeeds
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser

## Red Flags - Stop Immediately If:

1. **Subscription status checked only client-side** → Must be server-side
2. **Webhook signature verification removed** → Payment security breach
3. **Free user limits not enforced** → Revenue loss
4. **OpenAI API key exposed client-side** → Security breach + cost abuse
5. **Analysis endpoint accessible without limits** → Cost abuse vulnerability
6. **Premium features available without auth check** → Revenue loss

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
2. Check TypeScript compiles
3. Test changes locally
4. Never commit `.env` files

## Production Safety

**This is a LIVE application with:**
- Active revenue stream (Stripe subscriptions)
- Real costs per analysis (OpenAI API)
- Paying customers expecting reliable service
- Security requirements (payment processing)

**When uncertain:**
- Read the code first - understand before changing
- Ask questions - better to clarify than to break
- Test thoroughly - especially auth, payments, and limits
- Preserve revenue streams - don't break subscriptions or premium features
- Control costs - be mindful of OpenAI API usage

**Primary directive:** Ensure paying premium customers continue to receive the service they're paying for, and free users don't exceed their limits.
