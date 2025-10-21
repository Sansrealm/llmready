Project Context
LLM Check (LLM Ready Analyzer) - A SaaS application that analyzes websites for AI/LLM readiness and provides actionable SEO insights. This is a LIVE PRODUCTION application with paying customers.

🚨 CRITICAL PROJECT-SPECIFIC RULES
1. Never Break Core Business Logic

Analysis Engine (/app/api/analyze/route.js) - This is revenue-critical. Any changes must preserve the OpenAI integration, scoring logic, and response structure.
Subscription Management - Never modify Stripe webhook handlers without thorough understanding. Incorrect changes could fail to activate subscriptions or revoke access incorrectly.
User Limits - Free user limits (1 for guests, 3 for signed-in) are enforced via Clerk metadata. Changes could allow unlimited free access or block premium users.

2. Authentication & Authorization

Always verify premium status server-side using the /api/subscription-status endpoint
Never trust client-side subscription checks for feature gating
Clerk metadata stores: subscriptionStatus, analysisCount, lastAnalysisReset
Middleware protects routes - understand which routes are public vs. protected

3. Monetization is Key

Ads (Google AdSense) are only shown to free users with substantial content
Premium subscriptions ($9/month via Stripe) remove ads and unlock features
Never break ad display logic or premium feature gates

4. Cost Considerations

Every analysis costs money (OpenAI GPT-4o tokens)
PDF generation uses Puppeteer (resource-intensive, can timeout)
No caching implemented - repeated analyses cost full price each time


Project Architecture Map
Key Files & Their Purposes
🔴 CRITICAL - DO NOT MODIFY WITHOUT EXTREME CARE
├── /app/api/analyze/route.js           # Core analysis engine (OpenAI integration)
├── /app/api/webhooks/Stripe/route.js   # Payment processing (activates/revokes premium)
├── middleware.ts                        # Route protection (Clerk auth)
└── next.config.mjs                      # Security (CSP headers)

🟡 IMPORTANT - UNDERSTAND BEFORE CHANGING
├── /app/results/page.tsx                # Results display (tier-based features)
├── /app/api/subscription-status/route.js # Premium verification
├── /app/api/subscription/route.js       # Stripe billing portal
├── /components/navbar.tsx               # Auth state, navigation
└── /app/pricing/page.tsx                # Clerk PricingTable integration

🟢 SAFE TO MODIFY (with normal precautions)
├── /components/ui/*                     # shadcn/ui components
├── /app/guide/page.tsx                  # Educational content
├── /app/terms, /privacy                 # Legal pages
└── /components/footer.tsx               # Site footer
```

---

## Data Flow & Dependencies

### Analysis Flow
```
1. User submits URL → /app/page.tsx (form)
2. POST to /api/analyze
   ├── Check user auth & limits (Clerk metadata)
   ├── Fetch & parse website (Cheerio)
   ├── Send to OpenAI GPT-4o (costs $$)
   ├── Update analysis count
   └── Return structured results
3. Navigate to /results page
4. Display based on user tier (free vs premium)
```

### Subscription Flow
```
1. User clicks pricing → /pricing page (Clerk PricingTable)
2. Checkout via Stripe
3. Webhook → /api/webhooks/Stripe/route.js
   └── Update Clerk metadata: subscriptionStatus = 'active'
4. Server-side premium checks use /api/subscription-status
5. Manage subscription → Stripe billing portal
Premium Feature Gating
typescript// Server-side check pattern used throughout
const response = await fetch('/api/subscription-status');
const { isPremium } = await response.json();

if (isPremium) {
  // Show premium features (PDF export, no ads, etc.)
} else {
  // Show upgrade prompts, ads
}

Project-Specific Safety Checks
Before Modifying /app/api/analyze/route.js:

 Understand the OpenAI prompt structure
 Know what analysis parameters are extracted
 Verify you won't break the scoring algorithm
 Ensure limit checking logic remains intact
 Test with both free and premium accounts

Before Modifying Stripe Webhooks:

 Understand the webhook event types
 Know how subscription status is stored in Clerk
 Verify webhook signature validation stays intact
 Test subscription activation/cancellation flows
 Never skip webhook verification

Before Modifying User Limits:

 Understand Clerk metadata structure
 Know how guest vs signed-in limits differ
 Verify premium users get unlimited access
 Test limit reset logic (monthly for free users)
 Don't accidentally grant unlimited free access

Before Changing Ad Display:

 Verify ads only show for non-premium users
 Ensure substantial content check remains
 Keep AdSense policy compliance (content requirements)
 Test that premium users never see ads


Common Tasks & Project-Specific Patterns
Adding a New Analysis Parameter
typescript// 1. Update /app/api/analyze/route.js
// Add to the data sent to OpenAI
const analysisData = {
  // ... existing parameters
  newParameter: extractedValue
};

// 2. Update OpenAI prompt to analyze new parameter
// 3. Update results display in /app/results/page.tsx
// 4. Test with multiple websites
// 5. Verify scoring still works correctly
Creating a New Premium Feature
typescript// 1. Add feature to /app/results/page.tsx or new page
// 2. Add server-side premium check
const isPremium = await checkPremiumStatus();
if (!isPremium) {
  return <UpgradePrompt />;
}

// 3. Update /app/pricing/page.tsx to list new benefit
// 4. Test that free users see upgrade prompt
// 5. Test that premium users can access feature
Modifying Analysis Limits
typescript// Current limits (from Clerk metadata):
// - Guest: 1 analysis (localStorage)
// - Free signed-in: 3/month (Clerk metadata)
// - Premium: Unlimited

// To modify:
// 1. Update limit check in /app/api/analyze/route.js
// 2. Update display in navbar or user dashboard
// 3. Update pricing page if changing benefits
// 4. Test limit enforcement thoroughly
Adding a New Page
typescript// 1. Create /app/new-page/page.tsx
// 2. Decide if auth required (add to middleware if needed)
// 3. Add to navbar navigation if applicable
// 4. Implement with premium check if feature-gated
// 5. Add metadata for SEO
// 6. Test routing and auth protection

Environment Variables You'll Encounter
bash# OpenAI (cost-critical)
OPENAI_API_KEY=sk-...

# Stripe (payment-critical)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Clerk (auth-critical)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# App Config
NEXT_PUBLIC_APP_URL=https://llmcheck.com
```

**Never hardcode these values. Always use process.env.**

---

## Known Issues & Considerations

### 1. **No Caching Implementation**
- Repeated analyses of the same URL cost full OpenAI API fees
- Consider: Before implementing caching, discuss strategy (TTL, invalidation, storage)

### 2. **No Rate Limiting**
- `/api/analyze` endpoint could be abused
- Consider: Before adding rate limiting, discuss approach (per-user, per-IP, time windows)

### 3. **Puppeteer for PDF Generation**
- Resource-intensive, may timeout on serverless
- Location: `/app/api/generate-pdf` (not read in analysis)
- Consider: Monitor execution times, consider alternative PDF libraries

### 4. **Free User Limits in Clerk Metadata**
- Could theoretically be manipulated
- Consider: For highly critical apps, consider dedicated database for billing data

### 5. **Email Reports Feature**
- Marked as "will be implemented in next phase"
- If implementing: Need email service (Resend, SendGrid), templates, queueing

---

## Testing Checklist for LLM Check

After any changes, verify:

**Core Functionality:**
- [ ] Website analysis completes successfully
- [ ] OpenAI integration returns valid scores
- [ ] Results page displays all parameters correctly
- [ ] Recommendations are actionable and categorized

**Authentication & Limits:**
- [ ] Guest users can do 1 analysis (localStorage)
- [ ] Free signed-in users can do 3 analyses/month
- [ ] Premium users have unlimited analyses
- [ ] Limit counts increment correctly

**Subscription & Payments:**
- [ ] Stripe checkout flow completes
- [ ] Webhooks update premium status correctly
- [ ] Premium features unlock after payment
- [ ] Billing portal loads correctly
- [ ] Subscription cancellation revokes premium

**Monetization:**
- [ ] Ads display for free users (with content validation)
- [ ] Ads never display for premium users
- [ ] Premium upgrade prompts show for free users
- [ ] PDF export only available to premium (if implemented)

**UI/UX:**
- [ ] Dark mode works across all pages
- [ ] Mobile responsive on all screen sizes
- [ ] Navigation reflects auth state correctly
- [ ] Forms validate with Zod schemas
- [ ] Error messages are user-friendly

**Security:**
- [ ] CSP headers don't block required resources
- [ ] Webhook signatures are verified
- [ ] Protected routes require authentication
- [ ] Premium checks happen server-side

---

## Red Flags to Watch For

### 🚩 Stop Immediately If You See:
1. **Subscription status checked only on client-side** → Must be server-side
2. **Webhook signature verification removed** → Payment security breach
3. **Free user limits not enforced** → Revenue loss
4. **OpenAI API key exposed client-side** → Security breach + cost abuse
5. **Analysis endpoint accessible without rate limits** → Cost abuse vulnerability
6. **Premium features available without auth check** → Revenue loss

### ⚠️ Be Extra Careful With:
1. **Changes to analysis scoring logic** → Could make results inaccurate
2. **Modifications to Clerk metadata structure** → Could break user limits
3. **Updates to Stripe plan slugs** → Could break subscription matching
4. **CSP header changes** → Could break Stripe/Clerk/AdSense integration
5. **Middleware route protection changes** → Could expose private routes

---

## Communication Protocol for This Project

### When Starting ANY Task:

**1. State Your Understanding:**
```
"I'm going to [describe task]. This will require modifying:
- File X: [why]
- File Y: [why]

Potential risks:
- [risk 1]
- [risk 2]

My approach:
- [step 1]
- [step 2]

Does this approach sound correct?"
```

**2. For Critical Files (Red Category):**
```
"I need to modify [critical file]. Before proceeding:
- Current behavior: [describe]
- Proposed change: [describe]
- Testing plan: [describe]
- Rollback plan: [describe]

Please confirm this is safe to proceed."
```

**3. For Business Logic Changes:**
```
"This change affects [revenue/limits/features]:
- Current: [state]
- Proposed: [state]
- Business impact: [describe]

Please confirm the intended behavior."
When Encountering Issues:
**"I've encountered [issue].
Current state: [describe]
What I tried: [describe]
Error/unexpected behavior: [describe]
Options:

[option 1] - pros/cons
[option 2] - pros/cons

Which approach should I take?"**

Quick Reference: "Can I Modify This?"
File/ComponentSafety LevelRequires Discussion?/app/api/analyze/route.js🔴 CriticalYES - Always/app/api/webhooks/Stripe/route.js🔴 CriticalYES - Alwaysmiddleware.ts🔴 CriticalYES - Always/app/results/page.tsx🟡 ImportantFor major changes/app/api/subscription-status/route.js🟡 ImportantFor logic changes/components/navbar.tsx🟡 ImportantFor auth changes/components/ui/*🟢 SafeNo (standard changes)/app/guide/page.tsx🟢 SafeNoStyling/CSS changes🟢 SafeNo

Final Reminders
This Project is Special Because:

It generates revenue - Premium subscriptions are active income
It has costs - Every analysis costs OpenAI API fees
It has real users - Breaking analysis = customer complaints
Security matters - Payment processing must be bulletproof

Your Responsibilities:

Preserve revenue streams - Don't break subscriptions or premium features
Control costs - Be mindful of OpenAI API usage
Maintain quality - Analysis results must remain accurate
Ensure security - Auth and payment flows must be rock-solid

When Uncertain:

Read the code first - Understand before changing
Ask questions - Better to clarify than to break
Test thoroughly - Especially auth, payments, and limits
Document changes - Explain what you changed and why


🎯 Your Primary Directive

"Above all else, ensure that paying premium customers continue to receive the service they're paying for, and free users don't exceed their limits. When in doubt about anything related to authentication, subscriptions, or analysis limits - STOP and ASK."



Git Operations & Version Control
🔴 Critical Git Rules for Production SaaS
This is a LIVE production app. Git mistakes can deploy broken code to paying customers.

Pre-Commit Checklist
Before committing ANY changes, verify:
bash# 1. Build succeeds
npm run build

# 2. TypeScript compiles
npm run type-check  # or: npx tsc --noEmit

# 3. No obvious errors
npm run lint

# 4. Test locally
npm run dev  # Verify changes work as expected
Never commit if build fails or TypeScript has errors.

Commit Message Format
Use clear, descriptive commit messages that explain WHAT changed and WHY:
✅ Good Commit Messages
bashgit commit -m "fix: Prevent free users from bypassing analysis limits

- Add server-side validation in /api/analyze
- Check Clerk metadata before processing request
- Return 429 error when limit exceeded
- Fixes issue where localStorage could be cleared to reset limit"

git commit -m "feat: Add loading state to analysis button

- Disable button during API request
- Show spinner icon with 'Analyzing...' text
- Prevent duplicate submissions
- Improves UX during 10-15s analysis time"

git commit -m "refactor: Extract premium check into reusable hook

- Create useIsPremium() hook in /lib/hooks
- Replace inline fetch calls across 5 components
- Centralizes premium verification logic
- No functional changes, same behavior"
❌ Bad Commit Messages
bashgit commit -m "fixed stuff"
git commit -m "updates"
git commit -m "changes to results page"
git commit -m "wip"  # Never commit WIP to main!
```

### Commit Message Template
```
<type>: <short summary (50 chars max)>

<detailed explanation of what and why>

- Bullet point for each significant change
- Include file paths for context
- Note any breaking changes
- Reference issues/tickets if applicable

[Fixes #123] (if applicable)
Types:

feat: - New feature
fix: - Bug fix
refactor: - Code restructure, no behavior change
style: - Formatting, CSS changes
docs: - Documentation only
chore: - Dependencies, config, build
perf: - Performance improvement
security: - Security fix
revert: - Revert previous commit


Branching Strategy
For Feature Work
bash# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/add-caching-to-analysis

# Work on feature...
# Commit frequently with good messages

# Before merging back
git checkout main
git pull origin main
git checkout feature/add-caching-to-analysis
git rebase main  # or merge main into feature branch

# Test thoroughly!
npm run build
# Test the feature

# Merge to main
git checkout main
git merge feature/add-caching-to-analysis
git push origin main
For Bug Fixes
bash# For urgent production fixes
git checkout -b hotfix/fix-stripe-webhook-signature

# Make fix, test thoroughly
# Commit with clear description

# Deploy to production immediately
git checkout main
git merge hotfix/fix-stripe-webhook-signature
git push origin main
```

### Branch Naming Convention
```
feature/descriptive-name    # New features
fix/issue-description       # Bug fixes
hotfix/critical-fix        # Urgent production fixes
refactor/what-refactoring  # Code improvements
docs/what-documenting      # Documentation
chore/what-task            # Maintenance

Files to NEVER Commit
Update your .gitignore:
bash# Environment variables (CRITICAL - contains API keys)
.env
.env.local
.env*.local

# Dependencies
node_modules/

# Build output
.next/
out/
dist/

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/

# Vercel
.vercel

# Sensitive (if you add them)
*.pem
*.key
secrets/
🚨 If you accidentally commit .env:
bash# Remove from git but keep local file
git rm --cached .env
git commit -m "security: Remove .env from version control"

# Then IMMEDIATELY rotate all API keys:
# - OpenAI API key
# - Stripe keys
# - Clerk keys

Safety Checks Before Pushing
For Critical Files (Red Category)
If you modified any of these, STOP and verify:
bash# Files that affect revenue, payments, or core functionality
/app/api/analyze/route.js
/app/api/webhooks/Stripe/route.js
middleware.ts
next.config.mjs
Pre-push checklist for critical files:

 Did you test with a free user account?
 Did you test with a premium user account?
 Did you test the full flow end-to-end?
 Did you verify no breaking changes?
 Is there a rollback plan if this breaks?
 Did someone else review the changes?

Standard Pre-Push Checklist
bash# 1. Check what you're about to push
git diff origin/main

# 2. Review commit history
git log origin/main..HEAD

# 3. Ensure no sensitive data
git diff origin/main | grep -i "api_key\|secret\|password\|token"

# 4. Final build test
npm run build

# If all clear:
git push origin main

Git Commands Claude Should Use
Checking Status
bash# See what's changed
git status

# See specific changes
git diff

# See commits not yet pushed
git log origin/main..HEAD --oneline
Creating Commits
bash# Stage specific files (preferred over 'git add .')
git add app/results/page.tsx
git add components/ui/button.tsx

# Commit with descriptive message
git commit -m "feat: Add export button to results page

- Add PDF export button for premium users
- Show upgrade prompt for free users
- Style button to match design system
- Position in results header section"

# Or stage and commit together
git commit -am "fix: Correct typo in error message"
Branch Operations
bash# Create and switch to new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# Delete local branch (after merged)
git branch -d feature/completed-feature

# Push branch to remote
git push origin feature/new-feature
Viewing History
bash# View recent commits
git log --oneline -10

# View changes in last commit
git show

# View file history
git log --follow -- app/api/analyze/route.js

Rollback Procedures
If You Just Committed (Haven't Pushed)
bash# Undo last commit, keep changes
git reset --soft HEAD~1

# Undo last commit, discard changes (CAREFUL!)
git reset --hard HEAD~1
If You Pushed Bad Code
bash# Option 1: Revert (creates new commit that undoes changes)
git revert HEAD
git push origin main

# Option 2: Reset (if no one else pulled)
git reset --hard HEAD~1
git push origin main --force  # ⚠️ DANGEROUS - use only if sure!
Emergency: Restore to Previous Working State
bash# Find last known good commit
git log --oneline

# Reset to that commit (example)
git reset --hard abc1234

# Force push (coordinate with team first!)
git push origin main --force
```

---

## Git Workflow for Claude

When Claude is helping you with git operations:

### 1. Review Changes First
```
"Show me what files have been modified with git status and 
summarize the changes before we commit."
```

### 2. Stage Specific Files
```
"Stage only the files related to the analysis engine changes. 
Don't stage the experimental changes to the results page yet."
```

### 3. Write Good Commit Message
```
"Create a commit with a descriptive message following our format:
- Type: feat/fix/refactor
- Short summary
- Detailed explanation
- List of files changed"
```

### 4. Verify Before Push
```
"Before pushing, show me:
1. The diff of what will be pushed
2. The commit messages
3. Check if any critical files were modified"
```

---

## Working with Pull Requests (If Using)

If you're using GitHub/GitLab PRs:

### PR Title Format
```
feat: Add caching layer to reduce OpenAI API costs
fix: Correct premium status check on results page
refactor: Extract Stripe webhook handlers into separate files
PR Description Template
markdown## What does this PR do?
Brief description of the change

## Why is this needed?
Business reason or problem it solves

## What changed?
- Bullet list of specific changes
- Files modified and why

## How to test?
Step-by-step testing instructions

## Checklist
- [ ] Build passes
- [ ] TypeScript compiles
- [ ] Tested locally
- [ ] No breaking changes
- [ ] Updated documentation if needed
- [ ] No sensitive data committed

## Screenshots (if UI change)
Before/After images
```

---

## Protecting Important Branches

If you control the repo settings:

### GitHub Branch Protection Rules
```
Branch: main
☑ Require pull request reviews before merging
☑ Require status checks to pass (build, lint, tests)
☑ Require branches to be up to date before merging
☑ Include administrators
Alternative: Pre-push Hook
Create .git/hooks/pre-push:
bash#!/bin/bash

echo "🔍 Running pre-push checks..."

# Check if build succeeds
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Push aborted."
    exit 1
fi

# Check TypeScript
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors! Push aborted."
    exit 1
fi

echo "✅ All checks passed!"
exit 0
Make it executable:
bashchmod +x .git/hooks/pre-push

Git Tips for Production SaaS
1. Commit Frequently, Push Carefully
bash# Good practice: Small, focused commits
git commit -m "Add loading spinner to button"
git commit -m "Add error handling for failed API call"
git commit -m "Update button styles for consistency"

# Only push when feature is complete and tested
git push origin main
2. Use Meaningful Branch Names
bash✅ feature/add-analysis-caching
✅ fix/stripe-webhook-timeout
✅ hotfix/premium-check-failing

❌ test-branch
❌ my-changes
❌ asdf
3. Never Commit Broken Code to Main
bash# If experimenting, use a branch
git checkout -b experiment/trying-new-approach

# If it doesn't work out
git checkout main
git branch -D experiment/trying-new-approach
4. Document Breaking Changes
bashgit commit -m "feat: Update analysis API response format

BREAKING CHANGE: The /api/analyze endpoint now returns
scores as an array of objects instead of a flat object.

Before: { score: 85, params: {...} }
After: { overallScore: 85, parameters: [{...}] }

Migration guide: Update results page to use new format.
See /docs/API_MIGRATION.md for details."

Git Best Practices Summary
Do ✅Don't ❌Commit frequently with clear messagesCommit with vague messagesTest before pushingPush untested codeReview diff before committingUse git add . blindlyUse branches for experimentsWork directly on main for risky changesWrite descriptive commit bodiesLeave commit message emptyKeep commits focusedMix unrelated changesPush working codePush broken buildsUse .gitignore properlyCommit .env files

Quick Command Reference
bash# Status & Info
git status                    # See what changed
git diff                      # See line-by-line changes
git log --oneline -10         # Recent commits

# Staging & Committing
git add <file>                # Stage specific file
git commit -m "message"       # Commit staged changes
git commit -am "message"      # Stage all & commit (tracked files only)

# Branching
git checkout -b <branch>      # Create & switch to branch
git checkout <branch>         # Switch to existing branch
git branch -d <branch>        # Delete branch

# Syncing
git pull origin main          # Get latest changes
git push origin main          # Push your commits
git push origin <branch>      # Push specific branch

# Undoing
git reset --soft HEAD~1       # Undo commit, keep changes
git revert HEAD               # Create new commit that undoes last one
git checkout -- <file>        # Discard changes to file

# History
git log --follow -- <file>    # File history
git show <commit>             # View commit details
git diff origin/main          # Compare with remote

When Claude Should Ask Before Git Operations
🚨 Always Ask First:

Force pushing (git push --force)
Resetting commits that were already pushed
Deleting branches
Committing changes to critical files
Merging without testing
Creating commits with "WIP" or unclear messages

✅ Can Proceed:

git status, git diff, git log (read-only)
Creating branches
Staging specific files
Writing commit messages (with your approval)
Pulling latest changes