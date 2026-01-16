/**
 * Webhook Retry Queue System
 *
 * Handles failed Clerk API calls from Stripe webhooks with exponential backoff.
 * This ensures subscription data stays in sync even when Clerk API is temporarily unavailable.
 *
 * Retry Strategy:
 * - Attempt 1: Immediate (0s wait from failure)
 * - Attempt 2: After 1s
 * - Attempt 3: After 3s (from attempt 2)
 * - Attempt 4: After 9s (from attempt 3)
 * - After 3 failed attempts (4 total tries including initial), item is dead-lettered
 *
 * Architecture:
 * - In-memory queue (array-based)
 * - Can be migrated to Redis for production persistence
 * - Non-blocking: failures don't stop the queue processor
 */

import { clerkClient } from '@clerk/nextjs/server';

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata object that gets synced to Clerk publicMetadata
 * This matches the UserSubscription interface but uses Record for flexibility
 */
export interface WebhookMetadata {
  premiumUser?: boolean;
  subscriptionStatus?: string;
  subscriptionId?: string;
  customerId?: string;
  updatedAt?: string;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Individual item in the retry queue
 */
export interface RetryQueueItem {
  userId: string; // Clerk user ID
  metadata: WebhookMetadata; // Subscription data to update
  attemptCount: number; // Number of retry attempts (0 = first try failed, will retry)
  lastAttemptAt: Date; // Timestamp of last retry attempt
  createdAt: Date; // When this item was first added to queue
  error: string; // Last error message from failed attempt
}

/**
 * Queue statistics for monitoring
 */
export interface QueueStatus {
  totalItems: number; // Number of items currently in queue
  oldestItemAge: number | null; // Age in milliseconds of oldest item, null if empty
  itemsByAttemptCount: Record<number, number>; // Count of items per attempt number
  nextRetryIn: number | null; // Milliseconds until next retry is eligible, null if none
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Exponential backoff delays in milliseconds
 * - Index 0: Wait time after first failure (1 second)
 * - Index 1: Wait time after second failure (3 seconds)
 * - Index 2: Wait time after third failure (9 seconds)
 */
const RETRY_DELAYS_MS = [1000, 3000, 9000];

/**
 * Maximum number of retry attempts before dead-lettering
 * attemptCount goes from 0 to MAX_ATTEMPTS
 * 0 = first failure (will retry)
 * 1 = second failure (will retry)
 * 2 = third failure (will retry)
 * 3 = fourth failure (dead-letter, no more retries)
 */
const MAX_ATTEMPTS = 3;

// ============================================================================
// Queue Storage
// ============================================================================

/**
 * In-memory queue storage
 * TODO: Migrate to Redis for production persistence and multi-instance support
 */
let retryQueue: RetryQueueItem[] = [];

/**
 * Processing interval handle for cleanup
 */
let processingInterval: NodeJS.Timeout | null = null;

// ============================================================================
// Core Queue Functions
// ============================================================================

/**
 * Adds a failed Clerk metadata update to the retry queue
 *
 * Called when a Clerk API call fails in the Stripe webhook handler.
 * The item will be retried with exponential backoff.
 *
 * @param userId - Clerk user ID to update
 * @param metadata - Subscription metadata to sync to Clerk
 * @param error - Error message from the failed attempt (optional)
 *
 * @example
 * ```typescript
 * try {
 *   await client.users.updateUser(userId, { publicMetadata: metadata });
 * } catch (error) {
 *   addToRetryQueue(userId, metadata, error.message);
 * }
 * ```
 */
export function addToRetryQueue(
  userId: string,
  metadata: WebhookMetadata,
  error: string = 'Unknown error'
): void {
  const now = new Date();

  // Check if this user already has a pending update in the queue
  const existingIndex = retryQueue.findIndex(item => item.userId === userId);

  if (existingIndex !== -1) {
    // Update existing item with new metadata (merge to keep latest data)
    const existing = retryQueue[existingIndex];
    retryQueue[existingIndex] = {
      ...existing,
      metadata: { ...existing.metadata, ...metadata }, // Merge metadata
      error, // Update error message
      lastAttemptAt: now, // Update timestamp
    };

    console.log(
      `🔄 [Retry Queue] Updated existing queue item for user ${userId}`,
      `\n  📊 Attempt: ${existing.attemptCount}/${MAX_ATTEMPTS}`,
      `\n  ⏰ Last attempt: ${now.toISOString()}`,
      `\n  ❌ Error: ${error}`
    );
  } else {
    // Add new item to queue
    const queueItem: RetryQueueItem = {
      userId,
      metadata,
      attemptCount: 0, // First failure, hasn't been retried yet
      lastAttemptAt: now,
      createdAt: now,
      error,
    };

    retryQueue.push(queueItem);

    console.log(
      `➕ [Retry Queue] Added new item to queue`,
      `\n  👤 User ID: ${userId}`,
      `\n  📦 Metadata:`, metadata,
      `\n  ⏰ Created: ${now.toISOString()}`,
      `\n  ❌ Error: ${error}`,
      `\n  📈 Queue size: ${retryQueue.length}`
    );
  }

  // Start automatic processing if not already running
  startAutomaticProcessing();
}

/**
 * Processes the retry queue and attempts to update Clerk for eligible items
 *
 * Eligible items are those whose retry delay has elapsed based on attemptCount.
 * This function is non-blocking - if a retry fails, we increment the attempt
 * count and reschedule for next processing cycle.
 *
 * Called automatically every second when queue has items, but can also be
 * called manually for immediate processing.
 *
 * @returns Promise that resolves when processing is complete
 */
export async function processRetryQueue(): Promise<void> {
  if (retryQueue.length === 0) {
    return; // Nothing to process
  }

  const now = Date.now();
  const itemsToRetry: RetryQueueItem[] = [];
  const itemsToKeep: RetryQueueItem[] = [];

  // Separate items into those ready for retry vs those still waiting
  for (const item of retryQueue) {
    const timeSinceLastAttempt = now - item.lastAttemptAt.getTime();

    // Determine required wait time based on attempt count
    const requiredWaitTime = item.attemptCount > 0
      ? RETRY_DELAYS_MS[item.attemptCount - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
      : 0; // First retry is immediate

    if (timeSinceLastAttempt >= requiredWaitTime) {
      // Ready for retry
      itemsToRetry.push(item);
    } else {
      // Still waiting for retry delay
      itemsToKeep.push(item);
    }
  }

  if (itemsToRetry.length === 0) {
    return; // No items ready for retry yet
  }

  console.log(
    `🔄 [Retry Queue] Processing ${itemsToRetry.length} eligible items`,
    `\n  ⏳ Waiting: ${itemsToKeep.length} items`,
    `\n  📊 Total queue size: ${retryQueue.length}`
  );

  // Process each eligible item
  for (const item of itemsToRetry) {
    const success = await retryClerkUpdate(item);

    if (success) {
      // Successfully updated Clerk, remove from queue
      console.log(
        `✅ [Retry Queue] Successfully processed item`,
        `\n  👤 User ID: ${item.userId}`,
        `\n  📊 Took ${item.attemptCount + 1} attempts`,
        `\n  ⏱️  Total time in queue: ${now - item.createdAt.getTime()}ms`
      );
      // Item is not added back to itemsToKeep, effectively removing it
    } else {
      // Failed again, increment attempt count and reschedule
      item.attemptCount++;
      item.lastAttemptAt = new Date();

      if (item.attemptCount <= MAX_ATTEMPTS) {
        // Still have retries left, add back to queue
        itemsToKeep.push(item);

        const nextDelay = RETRY_DELAYS_MS[item.attemptCount - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        console.log(
          `⏳ [Retry Queue] Retry failed, will try again`,
          `\n  👤 User ID: ${item.userId}`,
          `\n  📊 Attempt: ${item.attemptCount}/${MAX_ATTEMPTS}`,
          `\n  ⏰ Next retry in: ${nextDelay}ms`,
          `\n  ❌ Error: ${item.error}`
        );
      } else {
        // Exceeded max attempts, dead-letter this item
        console.error(
          `💀 [Retry Queue] DEAD LETTER - Max attempts exceeded`,
          `\n  👤 User ID: ${item.userId}`,
          `\n  📊 Total attempts: ${item.attemptCount + 1}`,
          `\n  ⏱️  Time in queue: ${now - item.createdAt.getTime()}ms`,
          `\n  📦 Metadata:`, item.metadata,
          `\n  ❌ Last error: ${item.error}`,
          `\n  🚨 ACTION REQUIRED: Manual intervention needed to sync subscription data`
        );
        // Item is not added back, effectively removing it (dead-lettered)
      }
    }
  }

  // Update queue with remaining items
  retryQueue = itemsToKeep;

  // Stop automatic processing if queue is empty
  if (retryQueue.length === 0) {
    stopAutomaticProcessing();
    console.log(`✨ [Retry Queue] Queue is empty, stopped automatic processing`);
  }
}

/**
 * Attempts to update Clerk user metadata for a single queue item
 *
 * @param item - The queue item to retry
 * @returns Promise<boolean> - true if successful, false if failed
 */
async function retryClerkUpdate(item: RetryQueueItem): Promise<boolean> {
  try {
    console.log(
      `🔄 [Retry Queue] Attempting Clerk update`,
      `\n  👤 User ID: ${item.userId}`,
      `\n  📊 Attempt: ${item.attemptCount + 1}/${MAX_ATTEMPTS + 1}`,
      `\n  📦 Metadata:`, item.metadata
    );

    const client = await clerkClient();
    await client.users.updateUser(item.userId, {
      publicMetadata: item.metadata,
    });

    return true; // Success
  } catch (error) {
    // Update error message for logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    item.error = errorMessage;

    console.error(
      `❌ [Retry Queue] Clerk update failed`,
      `\n  👤 User ID: ${item.userId}`,
      `\n  📊 Attempt: ${item.attemptCount + 1}/${MAX_ATTEMPTS + 1}`,
      `\n  ❌ Error: ${errorMessage}`
    );

    return false; // Failed
  }
}

// ============================================================================
// Queue Management Functions
// ============================================================================

/**
 * Returns current queue statistics for monitoring and debugging
 *
 * @returns QueueStatus object with queue metrics
 *
 * @example
 * ```typescript
 * const status = getQueueStatus();
 * console.log(`Queue has ${status.totalItems} items`);
 * console.log(`Oldest item is ${status.oldestItemAge}ms old`);
 * ```
 */
export function getQueueStatus(): QueueStatus {
  const now = Date.now();

  // Calculate oldest item age
  let oldestItemAge: number | null = null;
  if (retryQueue.length > 0) {
    const oldestItem = retryQueue.reduce((oldest, item) => {
      return item.createdAt < oldest.createdAt ? item : oldest;
    });
    oldestItemAge = now - oldestItem.createdAt.getTime();
  }

  // Count items by attempt count
  const itemsByAttemptCount: Record<number, number> = {};
  for (const item of retryQueue) {
    itemsByAttemptCount[item.attemptCount] = (itemsByAttemptCount[item.attemptCount] || 0) + 1;
  }

  // Calculate next retry time
  let nextRetryIn: number | null = null;
  if (retryQueue.length > 0) {
    const nextEligible = retryQueue.reduce((earliest, item) => {
      const requiredWaitTime = item.attemptCount > 0
        ? RETRY_DELAYS_MS[item.attemptCount - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
        : 0;
      const eligibleAt = item.lastAttemptAt.getTime() + requiredWaitTime;
      return eligibleAt < earliest ? eligibleAt : earliest;
    }, Infinity);

    if (nextEligible !== Infinity) {
      nextRetryIn = Math.max(0, nextEligible - now);
    }
  }

  return {
    totalItems: retryQueue.length,
    oldestItemAge,
    itemsByAttemptCount,
    nextRetryIn,
  };
}

/**
 * Clears the entire retry queue
 *
 * WARNING: This will remove all pending retries. Use only for testing
 * or when you're certain you want to discard all pending updates.
 *
 * @returns Number of items that were cleared
 */
export function clearQueue(): number {
  const count = retryQueue.length;
  retryQueue = [];
  stopAutomaticProcessing();

  console.log(`🧹 [Retry Queue] Cleared ${count} items from queue`);

  return count;
}

// ============================================================================
// Automatic Processing
// ============================================================================

/**
 * Starts automatic queue processing every second
 * Only starts if not already running
 */
function startAutomaticProcessing(): void {
  if (processingInterval !== null) {
    return; // Already running
  }

  console.log(`🚀 [Retry Queue] Starting automatic processing (1s interval)`);

  processingInterval = setInterval(() => {
    processRetryQueue().catch(error => {
      console.error(`❌ [Retry Queue] Error in automatic processing:`, error);
    });
  }, 1000); // Process every second
}

/**
 * Stops automatic queue processing
 */
function stopAutomaticProcessing(): void {
  if (processingInterval !== null) {
    clearInterval(processingInterval);
    processingInterval = null;
    console.log(`⏸️  [Retry Queue] Stopped automatic processing`);
  }
}

// ============================================================================
// Configuration Exports
// ============================================================================

// Configuration exports (for testing/monitoring)
export const QUEUE_CONFIG = {
  RETRY_DELAYS_MS,
  MAX_ATTEMPTS,
} as const;
