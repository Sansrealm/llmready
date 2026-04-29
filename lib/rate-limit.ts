/**
 * Rate limiting for LLM-spend-critical endpoints.
 *
 * Uses Upstash Redis via REST. Two limiters are exported:
 *   - analyzeLimit         — guards /api/analyze        (audit scoring, Claude)
 *   - visibilityScanLimit  — guards /api/ai-visibility-scan (15 LLM calls per hit)
 *
 * These are burst-protection caps — the real per-user budget is still enforced
 * by Clerk-metadata monthly counters in `lib/auth-utils.ts`. Rate limits exist
 * to stop a script / loop from firing a month's quota in 60 seconds.
 *
 * Guests (unauthenticated) are keyed by IP. Signed-in users are keyed by Clerk
 * userId so IP changes (VPN, mobile) don't split their bucket.
 *
 * Fail-open: if Upstash is unreachable we log + alert but allow the request
 * through. Blocking legit users because our rate-limiter is down is worse than
 * the brief abuse window.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { sendAlert } from './alerts';

// ----------------------------------------------------------------------------
// Client
// ----------------------------------------------------------------------------

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

if (!redis) {
  console.warn(
    '[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled',
  );
}

// ----------------------------------------------------------------------------
// Limiters
// ----------------------------------------------------------------------------

/**
 * /api/analyze — audit scoring via Claude.
 * Authed users: 10/hour + 30/day. Guests: 3/hour + 5/day (by IP).
 *
 * We enforce the tighter of the two windows per request (hourly first, then
 * daily) via `limitAnalyze()` below.
 */
export const analyzeLimit = redis
  ? {
      authedHour: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        prefix: 'rl:analyze:authed:h',
        analytics: true,
      }),
      authedDay: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 d'),
        prefix: 'rl:analyze:authed:d',
        analytics: true,
      }),
      guestHour: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        prefix: 'rl:analyze:guest:h',
        analytics: true,
      }),
      guestDay: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 d'),
        prefix: 'rl:analyze:guest:d',
        analytics: true,
      }),
    }
  : null;

/**
 * /api/ai-visibility-scan — 15 LLM calls per hit, premium-only.
 * Authed premium users: 5/hour. No guest window (premium gate blocks guests).
 */
export const visibilityScanLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'rl:vis-scan:authed:h',
      analytics: true,
    })
  : null;

/**
 * /api/extension-subscription-status — token verification.
 * 20/hour by IP to prevent brute-force enumeration.
 */
export const extensionAuthLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      prefix: 'rl:ext-auth:ip:h',
      analytics: true,
    })
  : null;

/**
 * /api/share/email — email sending (premium).
 * 10/hour per userId to prevent spam relay abuse.
 */
export const emailSendLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'rl:email-send:user:h',
      analytics: true,
    })
  : null;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: 'hour' | 'day';
}

/**
 * Check the analyze-endpoint limiters for a given identity.
 *
 * @param identity  { userId } for authed, { ip } for guest. Exactly one must be set.
 */
export async function limitAnalyze(
  identity: { userId: string } | { ip: string },
): Promise<RateLimitResult> {
  if (!analyzeLimit) return { allowed: true };

  const isAuthed = 'userId' in identity;
  const key = isAuthed ? identity.userId : identity.ip;

  const hourLimiter = isAuthed ? analyzeLimit.authedHour : analyzeLimit.guestHour;
  const dayLimiter = isAuthed ? analyzeLimit.authedDay : analyzeLimit.guestDay;

  try {
    const hour = await hourLimiter.limit(key);
    if (!hour.success) {
      return {
        allowed: false,
        reason: 'hour',
        retryAfterSeconds: Math.max(1, Math.ceil((hour.reset - Date.now()) / 1000)),
      };
    }
    const day = await dayLimiter.limit(key);
    if (!day.success) {
      return {
        allowed: false,
        reason: 'day',
        retryAfterSeconds: Math.max(1, Math.ceil((day.reset - Date.now()) / 1000)),
      };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[rate-limit] analyze check failed, failing open:', err);
    // Fire-and-forget alert so we notice if the limiter is broken.
    sendAlert('Rate limiter unreachable (analyze)', {
      identity,
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
    return { allowed: true };
  }
}

/**
 * Check the visibility-scan limiter. Premium gate enforced upstream — this
 * function only handles the burst window for authed premium users.
 */
export async function limitVisibilityScan(userId: string): Promise<RateLimitResult> {
  if (!visibilityScanLimit) return { allowed: true };

  try {
    const res = await visibilityScanLimit.limit(userId);
    if (!res.success) {
      return {
        allowed: false,
        reason: 'hour',
        retryAfterSeconds: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
      };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[rate-limit] visibility-scan check failed, failing open:', err);
    sendAlert('Rate limiter unreachable (visibility-scan)', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
    return { allowed: true };
  }
}

/**
 * Check the extension auth limiter by client IP.
 */
export async function limitExtensionAuth(ip: string): Promise<RateLimitResult> {
  if (!extensionAuthLimit) return { allowed: true };

  try {
    const res = await extensionAuthLimit.limit(ip);
    if (!res.success) {
      return {
        allowed: false,
        reason: 'hour',
        retryAfterSeconds: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
      };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[rate-limit] extension-auth check failed, failing open:', err);
    sendAlert('Rate limiter unreachable (extension-auth)', {
      ip,
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
    return { allowed: true };
  }
}

/**
 * Check the email-send limiter by userId.
 */
export async function limitEmailSend(userId: string): Promise<RateLimitResult> {
  if (!emailSendLimit) return { allowed: true };

  try {
    const res = await emailSendLimit.limit(userId);
    if (!res.success) {
      return {
        allowed: false,
        reason: 'hour',
        retryAfterSeconds: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
      };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[rate-limit] email-send check failed, failing open:', err);
    sendAlert('Rate limiter unreachable (email-send)', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
    return { allowed: true };
  }
}

/**
 * Dedup lock for /api/analyze — prevents duplicate Claude calls when the same
 * URL is submitted twice in quick succession (page refresh, double navigation).
 *
 * Uses Redis NX (set-if-not-exists) with a 120s TTL matching the route's
 * maxDuration. Returns true if the lock was acquired (proceed with analysis),
 * false if another request holds it. Fails open if Redis is unavailable.
 */
export async function tryAcquireAnalyzeLock(
  userId: string,
  normalizedUrl: string,
): Promise<boolean> {
  if (!redis) return true;
  try {
    const key = `dedup:analyze:${userId}:${normalizedUrl}`;
    const result = await redis.set(key, '1', { nx: true, ex: 120 });
    return result !== null;
  } catch (err) {
    console.error('[rate-limit] analyze dedup lock failed, failing open:', err);
    return true;
  }
}

/**
 * Extract a best-effort client IP from a Next.js request. Uses Vercel's
 * `x-forwarded-for` (first hop is the real client on Vercel's edge).
 */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
