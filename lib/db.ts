import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { SiteMetric, DbAnalysis, TrendData, ShareResponse, VisibilityWaitlistEntry, AnalyzedUrlSummary } from './types';
import type { VisibilityResult } from './ai-visibility-scan';

/**
 * Normalizes a URL for consistent storage and querying
 * - Forces https protocol
 * - Lowercases hostname
 * - Removes trailing slashes (except root)
 * - Removes default ports
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Force https
    parsed.protocol = 'https:';

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove trailing slash from pathname (except root)
    if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // Remove default ports
    if (parsed.port === '80' || parsed.port === '443') {
      parsed.port = '';
    }

    return parsed.toString();
  } catch (error) {
    // If URL parsing fails, return lowercase trimmed original
    return url.toLowerCase().trim();
  }
}

/**
 * Saves an analysis result to the database
 * Called after successful OpenAI analysis completion
 */
export async function saveAnalysis({
  userId,
  url,
  overallScore,
  parameters,
}: {
  userId: string;
  url: string;
  overallScore: number;
  parameters: SiteMetric[];
}): Promise<DbAnalysis> {
  const normalizedUrl = normalizeUrl(url);

  const result = await sql`
    INSERT INTO analyses (user_id, url, normalized_url, overall_score, parameters)
    VALUES (
      ${userId},
      ${url},
      ${normalizedUrl},
      ${overallScore},
      ${JSON.stringify(parameters)}
    )
    RETURNING id, user_id, url, normalized_url, overall_score, parameters, analyzed_at, created_at
  `;

  return result.rows[0] as DbAnalysis;
}

/**
 * Retrieves analysis history for a specific URL
 * Returns analyses sorted by date (newest first)
 */
export async function getAnalysisHistory({
  userId,
  url,
  limit = 10,
}: {
  userId: string;
  url: string;
  limit?: number;
}): Promise<DbAnalysis[]> {
  const normalizedUrl = normalizeUrl(url);

  const result = await sql`
    SELECT
      id,
      overall_score,
      parameters,
      analyzed_at,
      created_at
    FROM analyses
    WHERE user_id = ${userId}
      AND normalized_url = ${normalizedUrl}
    ORDER BY analyzed_at DESC
    LIMIT ${limit}
  `;

  return result.rows as DbAnalysis[];
}

/**
 * Calculates trend statistics for a URL's analysis history
 */
export function calculateTrend(analyses: DbAnalysis[]): TrendData {
  if (analyses.length === 0) {
    return {
      trend: 'none',
      change: 0,
      firstScore: 0,
      latestScore: 0,
    };
  }

  // Analyses are sorted newest first
  const latestScore = analyses[0].overall_score;
  const firstScore = analyses[analyses.length - 1].overall_score;
  const change = latestScore - firstScore;

  let trend: TrendData['trend'];
  if (change > 5) {
    trend = 'improving';
  } else if (change < -5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  return {
    trend,
    change,
    firstScore,
    latestScore,
  };
}

/**
 * Retrieves the most recent analysis for a specific user and URL
 * Used for cache checking before generating new analysis
 */
export async function getAnalysisByUrl(
  userId: string,
  url: string
): Promise<DbAnalysis | null> {
  const normalizedUrl = normalizeUrl(url);

  const result = await sql`
    SELECT
      id,
      url,
      normalized_url,
      overall_score,
      parameters,
      analyzed_at,
      created_at
    FROM analyses
    WHERE user_id = ${userId}
      AND normalized_url = ${normalizedUrl}
    ORDER BY analyzed_at DESC
    LIMIT 1
  `;

  return (result.rows[0] as DbAnalysis) || null;
}

/**
 * Retrieves distinct analyzed URLs for a user, one row per unique URL
 * Returns the most recent analysis for each URL, ordered by recency
 * Used by the "My Analysis" navbar dropdown
 */
export async function getAnalyzedUrls(
  userId: string,
  limit: number = 20
): Promise<AnalyzedUrlSummary[]> {
  const result = await sql`
    SELECT
      url,
      normalized_url,
      overall_score AS latest_score,
      analyzed_at,
      (
        SELECT COUNT(*)::int
        FROM analyses a2
        WHERE a2.user_id = analyses.user_id
          AND a2.normalized_url = analyses.normalized_url
      ) AS analysis_count
    FROM (
      SELECT DISTINCT ON (normalized_url)
        url, normalized_url, overall_score, analyzed_at, user_id
      FROM analyses
      WHERE user_id = ${userId}
      ORDER BY normalized_url, analyzed_at DESC
    ) latest
    ORDER BY analyzed_at DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    url: row.url as string,
    normalizedUrl: row.normalized_url as string,
    latestScore: row.latest_score as number,
    analyzedAt: row.analyzed_at as string,
    analysisCount: row.analysis_count as number,
  }));
}

/**
 * Retrieves a specific analysis by its ID
 * Used for fetching cached analysis results
 */
export async function getAnalysisById(
  analysisId: string
): Promise<DbAnalysis | null> {
  const result = await sql`
    SELECT
      id,
      user_id,
      url,
      normalized_url,
      overall_score,
      parameters,
      analyzed_at,
      created_at,
      share_slug,
      is_public,
      shared_at,
      share_expires_at
    FROM analyses
    WHERE id = ${analysisId}
    LIMIT 1
  `;

  return (result.rows[0] as DbAnalysis) || null;
}

// ============================================================================
// Sharing Functions
// ============================================================================

/**
 * Generates a unique, URL-safe share slug for public sharing
 * Uses cryptographically secure random bytes for uniqueness
 *
 * @returns {string} A 12-character lowercase alphanumeric slug
 * @example "abc123xyz789"
 */
export function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    slug += chars[bytes[i] % chars.length];
  }
  return slug;
}

/**
 * Creates a public share link for an analysis
 * Verifies ownership, generates unique slug, and sets expiration
 *
 * @param {string} analysisId - The ID of the analysis to share
 * @param {string} userId - The user ID (must own the analysis)
 * @param {number} expiresInDays - Days until share link expires (default: 30)
 * @returns {Promise<ShareResponse>} Share slug and expiration date
 * @throws {Error} If analysis not found or user unauthorized
 */
export async function createPublicShare(
  analysisId: string,
  userId: string,
  expiresInDays: number = 30
): Promise<ShareResponse> {
  // Verify ownership
  const ownershipCheck = await sql`
    SELECT id FROM analyses
    WHERE id = ${analysisId} AND user_id = ${userId}
  `;

  if (ownershipCheck.rows.length === 0) {
    throw new Error('Unauthorized: You don\'t own this analysis');
  }

  // Generate unique slug with retry logic for collisions
  let slug: string;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    slug = generateShareSlug();

    try {
      // Update with unique slug
      const result = await sql`
        UPDATE analyses
        SET
          is_public = TRUE,
          share_slug = ${slug},
          shared_at = NOW(),
          share_expires_at = NOW() + INTERVAL '${expiresInDays} days'
        WHERE id = ${analysisId} AND user_id = ${userId}
        RETURNING share_slug, share_expires_at
      `;

      if (result.rows.length > 0) {
        return {
          share_slug: result.rows[0].share_slug,
          expires_at: new Date(result.rows[0].share_expires_at),
        };
      }
    } catch (error: unknown) {
      // Check if it's a unique constraint violation
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        attempts++;
        continue; // Try again with new slug
      }
      throw error; // Re-throw other errors
    }
  }

  throw new Error('Failed to generate unique share slug after multiple attempts');
}

/**
 * Retrieves an analysis by its public share slug
 * Only returns analyses that are public and not expired
 * This function is intentionally public (no userId check)
 *
 * @param {string} slug - The share slug to lookup
 * @returns {Promise<DbAnalysis | null>} The analysis if valid, null otherwise
 */
export async function getAnalysisByShareSlug(
  slug: string
): Promise<DbAnalysis | null> {
  const result = await sql`
    SELECT
      id,
      user_id,
      url,
      normalized_url,
      overall_score,
      parameters,
      analyzed_at,
      created_at,
      share_slug,
      is_public,
      shared_at,
      share_expires_at
    FROM analyses
    WHERE share_slug = ${slug}
      AND is_public = TRUE
      AND share_expires_at > NOW()
    LIMIT 1
  `;

  return (result.rows[0] as DbAnalysis) || null;
}

/**
 * Revokes sharing for an analysis (makes it private)
 * Clears all sharing-related fields
 *
 * @param {string} analysisId - The ID of the analysis to revoke
 * @param {string} userId - The user ID (must own the analysis)
 * @returns {Promise<boolean>} True if successful
 * @throws {Error} If analysis not found or user unauthorized
 */
export async function revokeShare(
  analysisId: string,
  userId: string
): Promise<boolean> {
  // Verify ownership
  const ownershipCheck = await sql`
    SELECT id FROM analyses
    WHERE id = ${analysisId} AND user_id = ${userId}
  `;

  if (ownershipCheck.rows.length === 0) {
    throw new Error('Unauthorized: You don\'t own this analysis');
  }

  // Revoke sharing
  await sql`
    UPDATE analyses
    SET
      is_public = FALSE,
      share_slug = NULL,
      shared_at = NULL,
      share_expires_at = NULL
    WHERE id = ${analysisId} AND user_id = ${userId}
  `;

  return true;
}

/**
 * Checks if a share link has expired
 * Helper function for API routes to validate share access
 *
 * @param {string} slug - The share slug to check
 * @returns {Promise<boolean>} True if expired, false if valid or not found
 */
export async function isShareExpired(slug: string): Promise<boolean> {
  const result = await sql`
    SELECT share_expires_at < NOW() as expired
    FROM analyses
    WHERE share_slug = ${slug}
  `;

  if (result.rows.length === 0) {
    return false; // Not found = not expired (handled elsewhere)
  }

  return result.rows[0].expired;
}

// ============================================================================
// Guest Email Capture Functions
// ============================================================================

/**
 * Captures or updates a guest email address after successful analysis
 * Deduplicates on email - increments count if email exists
 *
 * Uses PostgreSQL's INSERT...ON CONFLICT for atomic upsert behavior.
 * Stores emails in lowercase for consistency.
 *
 * @param {string} email - Guest email address
 * @returns {Promise<Object>} The guest email record with capture metadata
 *
 * @example
 * const result = await captureGuestEmail('user@example.com');
 * console.log(result.is_new); // true if first time, false if returning
 * console.log(result.analysis_count); // total analyses by this email
 */
export async function captureGuestEmail(email: string): Promise<{
  id: string;
  email: string;
  is_new: boolean;
  analysis_count: number;
}> {
  // Use INSERT ... ON CONFLICT for upsert behavior
  const result = await sql`
    INSERT INTO guest_emails (email, first_captured_at, last_analysis_at, analysis_count)
    VALUES (${email.toLowerCase()}, NOW(), NOW(), 1)
    ON CONFLICT (email)
    DO UPDATE SET
      last_analysis_at = NOW(),
      analysis_count = guest_emails.analysis_count + 1,
      updated_at = NOW()
    RETURNING id, email, analysis_count,
              (xmax = 0) AS is_new
  `;

  const record = result.rows[0];

  console.log(`📧 Guest email ${record.is_new ? 'captured' : 'updated'}: ${email} (${record.analysis_count} analyses)`);

  return {
    id: record.id,
    email: record.email,
    is_new: record.is_new,
    analysis_count: record.analysis_count,
  };
}

/**
 * Checks if a guest email has opted out of communications
 *
 * @param {string} email - Email address to check
 * @returns {Promise<boolean>} TRUE if opted out, FALSE otherwise
 */
export async function isGuestEmailOptedOut(email: string): Promise<boolean> {
  const result = await sql`
    SELECT opted_out
    FROM guest_emails
    WHERE email = ${email.toLowerCase()}
    LIMIT 1
  `;

  return result.rows[0]?.opted_out || false;
}

/**
 * Marks a guest email as opted out (unsubscribe)
 *
 * Used by unsubscribe endpoint to honor opt-out requests.
 * Sets opted_out = TRUE to exclude from future outreach queries.
 *
 * @param {string} email - Email address to opt out
 * @returns {Promise<boolean>} TRUE if successful, FALSE if email not found
 */
export async function optOutGuestEmail(email: string): Promise<boolean> {
  const result = await sql`
    UPDATE guest_emails
    SET opted_out = TRUE,
        updated_at = NOW()
    WHERE email = ${email.toLowerCase()}
  `;

  return (result.rowCount || 0) > 0;
}

/**
 * Retrieves all guest emails for outreach (excluding opted-out)
 *
 * Returns emails sorted by most recent analysis for targeted campaigns.
 * Automatically excludes opted-out users for GDPR compliance.
 *
 * @param {number} limit - Maximum number of emails to return (default 100)
 * @param {number} offset - Pagination offset (default 0)
 * @returns {Promise<Array>} Array of guest email records
 */
export async function getGuestEmailsForOutreach(
  limit: number = 100,
  offset: number = 0
): Promise<Array<{
  email: string;
  first_captured_at: string;
  last_analysis_at: string;
  analysis_count: number;
}>> {
  const result = await sql`
    SELECT email, first_captured_at, last_analysis_at, analysis_count
    FROM guest_emails
    WHERE opted_out = FALSE
    ORDER BY last_analysis_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result.rows as Array<{
    email: string;
    first_captured_at: string;
    last_analysis_at: string;
    analysis_count: number;
  }>;
}

// ============================================================================
// Visibility Waitlist Functions
// ============================================================================

/**
 * Saves a signup to the visibility waitlist.
 * Upserts on email — updates url/industry/timestamp on repeat signup.
 */
export async function saveVisibilityWaitlistSignup({
  email,
  url,
  industry,
  userId,
}: {
  email: string;
  url: string | null;
  industry: string | null;
  userId: string | null;
}): Promise<{ id: string; email: string; is_new: boolean }> {
  const result = await sql`
    INSERT INTO visibility_waitlist (email, url, industry, user_id)
    VALUES (${email.toLowerCase()}, ${url}, ${industry}, ${userId})
    ON CONFLICT (email)
    DO UPDATE SET
      url = COALESCE(EXCLUDED.url, visibility_waitlist.url),
      industry = COALESCE(EXCLUDED.industry, visibility_waitlist.industry),
      user_id = COALESCE(EXCLUDED.user_id, visibility_waitlist.user_id),
      created_at = NOW()
    RETURNING id, email, (xmax = 0) AS is_new
  `;

  const record = result.rows[0];

  console.log(`📋 Visibility waitlist ${record.is_new ? 'signup' : 'update'}: ${email}`);

  return {
    id: record.id,
    email: record.email,
    is_new: record.is_new,
  };
}

// ============================================================================
// AI Visibility Scan Functions
// ============================================================================

export interface VisibilityScanRow {
  id: string;
  normalized_url: string;
  industry: string | null;
  total_found: number;
  total_queries: number;
  scanned_at: string;
}

export interface VisibilityResultRow {
  model: string;
  prompt: string;
  found: boolean;
  snippet: string | null;
}

/**
 * Returns the latest scan for a URL if it falls within the cache window.
 * Returns null if no scan exists or the most recent is older than maxAgeHours.
 */
export async function getLatestVisibilityScan(
  url: string,
  maxAgeHours: number = 72
): Promise<{ scan: VisibilityScanRow; results: VisibilityResultRow[] } | null> {
  const normalizedUrl = normalizeUrl(url);
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  // Find the most recent scan within the cache window
  const scanResult = await sql`
    SELECT id, normalized_url, industry, total_found, total_queries, scanned_at
    FROM ai_visibility_scans
    WHERE normalized_url = ${normalizedUrl}
      AND scanned_at > ${cutoff}::timestamptz
    ORDER BY scanned_at DESC
    LIMIT 1
  `;

  if (scanResult.rows.length === 0) return null;

  const scan = scanResult.rows[0] as VisibilityScanRow;

  // Fetch the 15 detail rows for this scan
  const resultsResult = await sql`
    SELECT model, prompt, found, snippet
    FROM ai_visibility_results
    WHERE scan_id = ${scan.id}
    ORDER BY model, prompt
  `;

  return { scan, results: resultsResult.rows as VisibilityResultRow[] };
}

/**
 * Saves a completed scan and its 15 result rows.
 * Returns the created scan ID.
 */
export async function saveVisibilityScan(
  url: string,
  industry: string | null,
  totalFound: number,
  totalQueries: number,
  results: VisibilityResult[]
): Promise<string> {
  const normalizedUrl = normalizeUrl(url);

  // Insert scan header
  const scanInsert = await sql`
    INSERT INTO ai_visibility_scans (normalized_url, industry, total_found, total_queries)
    VALUES (${normalizedUrl}, ${industry}, ${totalFound}, ${totalQueries})
    RETURNING id
  `;

  const scanId = scanInsert.rows[0].id as string;

  // Insert all result rows (sequential to avoid connection pool pressure)
  for (const r of results) {
    await sql`
      INSERT INTO ai_visibility_results (scan_id, model, prompt, found, snippet)
      VALUES (${scanId}, ${r.model}, ${r.prompt}, ${r.found}, ${r.snippet ?? null})
    `;
  }

  return scanId;
}

/**
 * Returns all historical scan headers for a URL, oldest first.
 * Used to render the visibility trend line.
 */
export async function getVisibilityScanHistory(
  url: string
): Promise<VisibilityScanRow[]> {
  const normalizedUrl = normalizeUrl(url);

  const result = await sql`
    SELECT id, normalized_url, industry, total_found, total_queries, scanned_at
    FROM ai_visibility_scans
    WHERE normalized_url = ${normalizedUrl}
    ORDER BY scanned_at ASC
  `;

  return result.rows as VisibilityScanRow[];
}
