## Goal
Enable in-app notifications for premium + agency users, backed by a first-party user-activity log. Ship admin-composed broadcasts in Phase A. Layer rule-based automation (e.g. "citation rate dropped", "no scan in 14 days") on top in Phase B. Email mirror + preferences UI deferred to Phase C.

## User story
- As an admin (signed in via a dedicated Clerk account with `isAdmin=true`), I want to compose a broadcast and target a tier (Premium / Agency / Paid), so that I can announce features, pricing changes, or maintenance to paying customers without running an email campaign.
- As a premium or agency user, I want to see a bell icon with unread count in the navbar and a toast flash when a new notification arrives, so that I don't miss important product updates or behavioural alerts about my scans.
- As a free user, I want notifications to stay hidden from my UI entirely, so that my experience isn't cluttered with messaging reserved for paid tiers.

## Technical approach
**Tables** (two new migrations):
- `user_activity` — append-only event log (user_id, event_type, analysis_id, scan_id, metadata, created_at). Fire-and-forget writes.
- `notifications` — one row per (user, notification). Fields: source ('broadcast' | 'auto_rule'), broadcast_id, title, body, cta_label, cta_url, tier_targeted, created_at, read_at, dismissed_at.

**Helpers** (mirror `logLlmSpend` pattern):
- `lib/activity-log.ts` → `void logActivity({ userId, eventType, ... })`
- `lib/notifications.ts` → `createBroadcast`, `getUserNotifications`, `markRead`, `unreadCount`

**API routes**:
- `GET /api/notifications` (premium/agency-gated)
- `POST /api/notifications/mark-read`
- `POST /api/admin/notifications/broadcast` (checkAdminStatus-gated)
- `GET /api/admin/users/summary` (audience-count preview)

**UI**:
- `components/notifications-bell.tsx` (new) — shadcn DropdownMenu with unread badge, mounted in `navbar.tsx` for premium/agency only
- `components/notifications-provider.tsx` (new) — polls every 60s + on window focus; fires sonner toast (`import { toast } from "sonner"`) when unread count increases. The `<Toaster />` is already mounted in `app/layout.tsx`.
- `app/admin/notifications/page.tsx` (new) — composer: title + body + optional CTA + audience picker + Send

**Activity-log hook sites** (Phase A baseline signal):
- `/api/analyze` success → `analysis_completed`
- `/api/ai-visibility-scan` fresh scan → `visibility_scan_completed`
- Stripe webhook → `upgraded_to_premium`, `downgraded`

**Supporting changes**:
- Add `email: string | null` to `UserSubscriptionInfo` in `lib/auth-utils.ts` (populated from existing Clerk fetch; needed for admin UI + future email-mirror)

## Open questions
- Polling cadence — 60s default; is that right for the retention/action use case or should we go longer (180s) for less chatty feel?
- Retention — do notifications expire (e.g. 90 days), or keep forever per user?
- Admin composer: markdown body allowed, or plain text + CTA button only?
- Does `notifications-provider` mount on every route, or only inside authed layout segments?
- Phase B trigger rules: which first — "no scan in N days", "citation rate drop ≥X%", something else?

## Status
- 2026-04-16 — Planned. Scope + architecture agreed in plan-mode session. Awaiting Phase A kickoff.
- Phase A scope: admin broadcasts + activity log + bell/toast + admin composer. NOT in Phase A: rule-based automation, email mirror, preferences UI, WebSocket/SSE.
