/**
 * Centralized Authentication & Subscription Utilities
 *
 * Provides consistent access to user subscription status and limits
 * across all API routes.
 */

import { auth, clerkClient } from '@clerk/nextjs/server';
import { UserSubscription } from './types';

// Analysis limits by user tier
const FREE_USER_LIMIT = 3;
const PREMIUM_USER_LIMIT = 25;
const AGENCY_USER_LIMIT = 100;

/**
 * Complete user subscription information
 */
export interface UserSubscriptionInfo {
  userId: string | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  isAgency: boolean;
  analysisCount: number;
  limit: number;
  canAnalyze: boolean;
  remainingAnalyses: number;
  metadata: Partial<UserSubscription>;
}

/**
 * Gets comprehensive subscription information for the current user
 *
 * This is the single source of truth for user limits and premium status.
 * Use this instead of manually checking Clerk metadata.
 *
 * @returns Complete subscription info including limits and availability
 */
export async function getUserSubscription(): Promise<UserSubscriptionInfo> {
  try {
    // Get authentication status
    const { userId, has } = await auth();

    // Guest users (not authenticated)
    if (!userId) {
      return {
        userId: null,
        isAuthenticated: false,
        isPremium: false,
        isAgency: false,
        analysisCount: 0,
        limit: 0, // Guests are handled separately with localStorage
        canAnalyze: false,
        remainingAnalyses: 0,
        metadata: {},
      };
    }

    // Get user data from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = (user.publicMetadata as Partial<UserSubscription>) || {};

    // Determine plan using Clerk's has() (session-level) with metadata fallback
    const isAgency = (has?.({ plan: 'llm_check_agency' }) ?? false) as boolean;
    const isPremiumPlan = !isAgency && ((has?.({ plan: 'llm_check_premium' }) ?? false) as boolean || metadata.premiumUser === true);
    // Agency users get all premium features; isPremium = true for both paid tiers
    const isPremium = isPremiumPlan || isAgency;

    // Get analysis count (defaults to 0)
    let analysisCount = metadata.analysisCount || 0;

    // Monthly reset logic for free users and agency users (both have monthly caps)
    // Premium-only users don't reset (preserves existing behaviour)
    if (!isPremiumPlan) {
      try {
        // Initialize lastAnalysisReset if it doesn't exist (first-time user)
        const lastResetDate = metadata.lastAnalysisReset
          ? new Date(metadata.lastAnalysisReset)
          : null;

        const now = new Date();

        // Calculate months elapsed since last reset using UTC dates
        // This ensures consistency across all timezones
        // Note: Uses calendar month difference (e.g., Dec 17 → Jan 16 = 1 month)
        // This is consistent with typical subscription billing cycles
        let shouldReset = false;

        if (!lastResetDate) {
          // First-time user: initialize the reset timestamp
          shouldReset = true;
          console.log(`🔧 Initializing analysis reset timestamp for user ${userId}`);
        } else {
          // Calculate months difference
          const monthsSinceReset =
            (now.getUTCFullYear() - lastResetDate.getUTCFullYear()) * 12 +
            (now.getUTCMonth() - lastResetDate.getUTCMonth());

          if (monthsSinceReset >= 1) {
            shouldReset = true;
            console.log(`🔄 Monthly reset triggered for user ${userId} (${monthsSinceReset} month(s) elapsed)`);
          }
        }

        // Perform the reset if needed
        if (shouldReset) {
          const oldCount = analysisCount;
          analysisCount = 0;

          // Update Clerk metadata with reset values
          await client.users.updateUser(userId, {
            publicMetadata: {
              ...user.publicMetadata,
              analysisCount: 0,
              lastAnalysisReset: now.toISOString(),
            },
          });

          console.log(`✅ Analysis count reset: ${oldCount} → 0 (userId: ${userId}, timestamp: ${now.toISOString()})`);
        }
      } catch (resetError) {
        // Log error but don't fail the entire request
        // User will continue with their current count if reset fails
        console.error(`❌ Error during monthly reset for user ${userId}:`, resetError);
        console.error('User will continue with current analysis count until next attempt');
      }
    }

    // Determine limit based on user tier
    const limit = isAgency ? AGENCY_USER_LIMIT : isPremiumPlan ? PREMIUM_USER_LIMIT : FREE_USER_LIMIT;

    // Calculate remaining analyses
    const remainingAnalyses = Math.max(0, limit - analysisCount);

    // Determine if user can perform analysis
    const canAnalyze = analysisCount < limit;

    return {
      userId,
      isAuthenticated: true,
      isPremium,
      isAgency,
      analysisCount,
      limit,
      canAnalyze,
      remainingAnalyses,
      metadata,
    };
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    // Return safe defaults on error
    return {
      userId: null,
      isAuthenticated: false,
      isPremium: false,
      isAgency: false,
      analysisCount: 0,
      limit: 0,
      canAnalyze: false,
      remainingAnalyses: 0,
      metadata: {},
    };
  }
}

/**
 * Increments the analysis count for the current user
 *
 * IMPORTANT: Only call this AFTER a successful analysis completion.
 * This prevents charging users for failed analyses.
 *
 * @param userId - The Clerk user ID
 * @returns The new analysis count
 */
export async function incrementAnalysisCount(userId: string): Promise<number> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = (user.publicMetadata as Partial<UserSubscription>) || {};

    // Get current count
    const currentCount = metadata.analysisCount || 0;
    const newCount = currentCount + 1;

    // Update metadata with new count
    await client.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        analysisCount: newCount,
        lastAnalysisReset: metadata.lastAnalysisReset || new Date().toISOString(),
      },
    });

    console.log(`✅ Analysis count incremented: ${currentCount} → ${newCount} (userId: ${userId})`);
    return newCount;
  } catch (error) {
    console.error('Error incrementing analysis count:', error);
    throw error;
  }
}

/**
 * Checks if a user has premium status
 *
 * This is a lightweight check without fetching full subscription info.
 * Use getUserSubscription() if you need more details.
 *
 * @returns Object with premium status and userId
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean;
  userId: string | null;
}> {
  try {
    const { userId, has } = await auth();

    if (!userId) {
      return { isPremium: false, userId: null };
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = (user.publicMetadata as Partial<UserSubscription>) || {};

    const isAgency = (has?.({ plan: 'llm_check_agency' }) ?? false) as boolean;
    const isPremium = isAgency || (has?.({ plan: 'llm_check_premium' }) ?? false) as boolean || metadata.premiumUser === true;

    return { isPremium, userId };
  } catch (error) {
    console.error('Error checking premium status:', error);
    return { isPremium: false, userId: null };
  }
}

/**
 * Validates that a premium user hasn't exceeded their limit
 *
 * Premium users get higher limits but are still rate-limited.
 * This prevents abuse and ensures fair usage.
 *
 * @returns true if premium user can proceed, false otherwise
 */
export async function validatePremiumAccess(): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const subscription = await getUserSubscription();

  if (!subscription.isAuthenticated) {
    return { allowed: false, reason: 'Authentication required' };
  }

  if (!subscription.isPremium) {
    return { allowed: false, reason: 'Premium subscription required' };
  }

  if (!subscription.canAnalyze) {
    return {
      allowed: false,
      reason: `Premium analysis limit reached (${subscription.analysisCount}/${subscription.limit})`,
    };
  }

  return { allowed: true };
}

/**
 * Checks whether the current user has admin access.
 *
 * Admin is granted by setting `publicMetadata.isAdmin = true` on the Clerk user
 * (via the Clerk dashboard — there's no self-serve path). Use this wherever an
 * endpoint or page exposes data that should not be visible to ordinary signed-in
 * users (guest-email list, retry-queue controls, future admin surfaces).
 *
 * @returns Object with admin status and userId (both derived from Clerk)
 */
export async function checkAdminStatus(): Promise<{
  isAdmin: boolean;
  userId: string | null;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { isAdmin: false, userId: null };
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = (user.publicMetadata as Partial<UserSubscription>) || {};

    return { isAdmin: metadata.isAdmin === true, userId };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return { isAdmin: false, userId: null };
  }
}

/**
 * Export limit constants for use in client-side code
 */
export const ANALYSIS_LIMITS = {
  FREE: FREE_USER_LIMIT,
  PREMIUM: PREMIUM_USER_LIMIT,
  AGENCY: AGENCY_USER_LIMIT,
} as const;
