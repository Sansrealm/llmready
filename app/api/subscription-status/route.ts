import { NextResponse } from 'next/server';
import { getUserSubscription, ANALYSIS_LIMITS } from '@/lib/auth-utils';

/**
 * GET /api/subscription-status
 *
 * Returns the current user's subscription status, analysis count, and limits.
 * Used by client-side code to determine premium features and remaining analyses.
 */
export async function GET() {
  try {
    // Get comprehensive subscription info
    const subscription = await getUserSubscription();

    console.log('✅ Subscription status check:', {
      userId: subscription.userId,
      isPremium: subscription.isPremium,
      count: subscription.analysisCount,
      limit: subscription.limit,
      remaining: subscription.remainingAnalyses,
    });

    // Return complete status information
    return NextResponse.json({
      isAuthenticated: subscription.isAuthenticated,
      isPremium: subscription.isPremium,
      analysisCount: subscription.analysisCount,
      limit: subscription.limit,
      remainingAnalyses: subscription.remainingAnalyses,
      canAnalyze: subscription.canAnalyze,
      limits: {
        free: ANALYSIS_LIMITS.FREE,
        premium: ANALYSIS_LIMITS.PREMIUM,
      },
    });
  } catch (error) {
    console.error('❌ Error checking subscription status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch subscription status',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
