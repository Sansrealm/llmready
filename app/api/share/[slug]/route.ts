import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisByShareSlug } from '@/lib/db';

/**
 * GET /api/share/[slug]
 * Retrieves a shared analysis by its public slug
 *
 * This is a PUBLIC endpoint - no authentication required.
 * Anyone with the share slug can access the analysis if it's still valid.
 * Only returns analyses that are public and not expired.
 *
 * @param params.slug - The share slug from the URL
 * @returns Analysis data with sharing metadata
 *
 * @example
 * Request:
 * GET /api/share/xyz789abc
 *
 * Response (200):
 * {
 *   "id": "abc-123",
 *   "url": "https://example.com",
 *   "overall_score": 85,
 *   "parameters": [...],
 *   "analyzed_at": "2026-01-19T12:00:00Z",
 *   "shared_at": "2026-01-19T12:00:00Z",
 *   "share_expires_at": "2026-02-18T12:00:00Z"
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Extract slug from route params
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing share slug' },
        { status: 400 }
      );
    }

    // 2. Fetch analysis by share slug
    // This function only returns public, non-expired analyses
    const analysis = await getAnalysisByShareSlug(slug);

    // 3. Handle not found or expired
    if (!analysis) {
      return NextResponse.json(
        { error: 'Share link not found or expired' },
        { status: 404 }
      );
    }

    console.log(`✅ Public share accessed: ${slug} (analysis: ${analysis.id})`);

    // 4. Return analysis data
    // Note: We exclude user_id for privacy
    return NextResponse.json({
      id: analysis.id,
      url: analysis.url,
      overall_score: analysis.overall_score,
      parameters: analysis.parameters,
      analyzed_at: analysis.analyzed_at,
      // Share metadata
      shared_at: analysis.shared_at,
      share_expires_at: analysis.share_expires_at,
    });
  } catch (error) {
    console.error('❌ Error fetching shared analysis:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
