import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getQueueStatus, clearQueue } from '@/lib/queue/webhook-retry';

/**
 * GET /api/admin/retry-queue
 *
 * Returns current retry queue statistics for monitoring.
 * This is an admin endpoint that requires authentication.
 *
 * Response:
 * {
 *   totalItems: number,
 *   oldestItemAge: number | null,  // milliseconds
 *   itemsByAttemptCount: { [key: string]: number },
 *   nextRetryIn: number | null,  // milliseconds
 * }
 */
export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current queue status
    const queueStatus = getQueueStatus();

    console.log(
      `📊 [Admin] Retry queue status requested by user ${userId}`,
      `\n  📦 Total items: ${queueStatus.totalItems}`,
      `\n  ⏱️  Oldest item age: ${queueStatus.oldestItemAge ? `${queueStatus.oldestItemAge}ms` : 'N/A'}`,
      `\n  🔄 Items by attempt: ${JSON.stringify(queueStatus.itemsByAttemptCount)}`,
      `\n  ⏰ Next retry in: ${queueStatus.nextRetryIn ? `${queueStatus.nextRetryIn}ms` : 'N/A'}`
    );

    // Return queue statistics
    return NextResponse.json(queueStatus);
  } catch (error) {
    console.error('❌ [Admin] Error fetching retry queue status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch retry queue status',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/retry-queue
 *
 * Clears the entire retry queue.
 * This is an admin endpoint that requires authentication.
 *
 * WARNING: This will remove all pending retries. Use with caution.
 *
 * Response:
 * {
 *   success: boolean,
 *   itemsCleared: number,
 *   message: string
 * }
 */
export async function DELETE() {
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Clear the queue
    const itemsCleared = clearQueue();

    console.log(
      `🧹 [Admin] Retry queue cleared by user ${userId}`,
      `\n  📦 Items cleared: ${itemsCleared}`
    );

    // Return success response
    return NextResponse.json({
      success: true,
      itemsCleared,
      message: `Successfully cleared ${itemsCleared} items from retry queue`,
    });
  } catch (error) {
    console.error('❌ [Admin] Error clearing retry queue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to clear retry queue',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
