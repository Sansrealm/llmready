import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { SiteMetric, DbAnalysis, TrendData, ShareResponse } from './types';

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
 * Retrieves a specific analysis by its ID
 * Used for fetching cached analysis results
 */
export async function getAnalysisById(
  analysisId: string
): Promise<DbAnalysis | null> {
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
