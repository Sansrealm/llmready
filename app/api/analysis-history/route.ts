import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAnalysisHistory, calculateTrend } from '@/lib/db';

/**
 * GET /api/analysis-history
 *
 * Retrieves analysis history for a specific URL
 * PREMIUM ONLY feature
 *
 * Query params:
 * - url (required): The URL to get history for
 * - limit (optional): Number of results to return (default: 10, max: 50)
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const { userId, has } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check premium status using Clerk's billing feature
    const isPremium = has({ plan: 'llm_check_premium' });

    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'Premium subscription required',
          message: 'Analysis history is a premium feature. Upgrade to access your score trends.'
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 50) : 10;

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Fetch analysis history from database
    const analyses = await getAnalysisHistory({
      userId,
      url,
      limit,
    });

    // Calculate trend statistics
    const trendStats = calculateTrend(analyses);

    // Format response
    const response = {
      analyses: analyses.map((analysis) => ({
        id: analysis.id,
        overallScore: analysis.overall_score,
        parameters: analysis.parameters,
        analyzedAt: analysis.analyzed_at,
      })),
      total: analyses.length,
      firstAnalysis: analyses.length > 0 ? analyses[analyses.length - 1].analyzed_at : null,
      latestScore: trendStats.latestScore,
      firstScore: trendStats.firstScore,
      trend: trendStats.trend,
      change: trendStats.change,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error fetching analysis history:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analysis history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
