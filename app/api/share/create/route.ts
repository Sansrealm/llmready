import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPublicShare } from '@/lib/db';

/**
 * POST /api/share/create
 * Creates a public share link for an analysis
 *
 * This endpoint generates a unique shareable URL for an analysis that the user owns.
 * The share link is valid for 30 days and can be accessed publicly without authentication.
 *
 * @param request.body.analysisId - The ID of the analysis to share
 * @returns Share URL and expiration date
 *
 * @example
 * Request:
 * POST /api/share/create
 * { "analysisId": "abc-123" }
 *
 * Response (200):
 * {
 *   "shareUrl": "https://llmcheck.app/share/xyz789abc",
 *   "expiresAt": "2026-02-18T12:00:00Z"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { analysisId } = body;

    // 3. Validate required fields
    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing required field: analysisId' },
        { status: 400 }
      );
    }

    // 4. Create public share (30 day expiry)
    // This function verifies ownership and throws if unauthorized
    const shareData = await createPublicShare(analysisId, userId, 30);

    // 5. Build full share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://llmcheck.app';
    const shareUrl = `${baseUrl}/share/${shareData.share_slug}`;

    console.log(`✅ Share link created for analysis ${analysisId}: ${shareUrl}`);

    // 6. Return success response
    return NextResponse.json({
      shareUrl,
      expiresAt: shareData.expires_at.toISOString(),
    });
  } catch (error) {
    console.error('❌ Error creating share link:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
