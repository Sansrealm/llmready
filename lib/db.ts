import { sql } from '@vercel/postgres';
import { SiteMetric, DbAnalysis, TrendData } from './types';

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
}) {
  const normalizedUrl = normalizeUrl(url);

  await sql`
    INSERT INTO analyses (user_id, url, normalized_url, overall_score, parameters)
    VALUES (
      ${userId},
      ${url},
      ${normalizedUrl},
      ${overallScore},
      ${JSON.stringify(parameters)}
    )
  `;
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
