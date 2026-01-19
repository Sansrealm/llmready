import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { revokeShare } from '@/lib/db';

/**
 * DELETE /api/share/revoke
 * Revokes a public share link for an analysis
 *
 * This endpoint makes an analysis private again by removing its share link.
 * All sharing metadata is cleared and the link becomes inaccessible.
 * Only the analysis owner can revoke a share.
 *
 * @param request.body.analysisId - The ID of the analysis to revoke sharing for
 * @returns Success confirmation
 *
 * @example
 * Request:
 * DELETE /api/share/revoke
 * { "analysisId": "abc-123" }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Share link revoked successfully"
 * }
 */
export async function DELETE(request: NextRequest) {
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

    // 4. Revoke share
    // This function verifies ownership and throws if unauthorized
    await revokeShare(analysisId, userId);

    console.log(`✅ Share link revoked for analysis ${analysisId}`);

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully',
    });
  } catch (error) {
    console.error('❌ Error revoking share link:', error);

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
