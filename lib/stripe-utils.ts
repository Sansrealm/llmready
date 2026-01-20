import { clerkClient } from '@clerk/nextjs/server';

/**
 * Result of a user lookup operation
 */
export interface UserLookupResult {
  userId: string | null;
  found: boolean;
}

/**
 * Finds a Clerk user by their Stripe subscription ID
 *
 * Searches Clerk users where publicMetadata.subscriptionId matches the provided ID.
 * This is used when Stripe sends webhook events for subscription updates/deletions.
 *
 * @param subscriptionId - The Stripe subscription ID (e.g., "sub_xxxxx")
 * @returns Object with userId (or null if not found) and found boolean
 * @throws Error if Clerk API call fails
 *
 * @example
 * const result = await findUserByStripeSubscription('sub_123');
 * if (result.found) {
 *   console.log('User ID:', result.userId);
 * }
 */
export async function findUserByStripeSubscription(
  subscriptionId: string
): Promise<UserLookupResult> {
  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      query: JSON.stringify({
        publicMetadata: { subscriptionId },
      }),
    });

    if (!response.data || response.data.length === 0) {
      console.error('No user found with subscription ID:', subscriptionId);
      return { userId: null, found: false };
    }

    const userId = response.data[0].id;
    console.log('Found user with subscription:', userId);
    return { userId, found: true };

  } catch (error) {
    console.error('Error finding user by subscription ID:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to lookup user by subscription: ${errorMessage}`);
  }
}

/**
 * Finds a Clerk user by their Stripe customer ID
 *
 * Searches Clerk users where publicMetadata.customerId matches the provided ID.
 * This is used as a fallback when subscription ID lookup fails, or during checkout.
 *
 * @param customerId - The Stripe customer ID (e.g., "cus_xxxxx")
 * @returns Object with userId (or null if not found) and found boolean
 * @throws Error if Clerk API call fails
 *
 * @example
 * const result = await findUserByStripeCustomer('cus_123');
 * if (result.found) {
 *   console.log('User ID:', result.userId);
 * }
 */
export async function findUserByStripeCustomer(
  customerId: string
): Promise<UserLookupResult> {
  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      query: JSON.stringify({
        publicMetadata: { customerId },
      }),
    });

    if (!response.data || response.data.length === 0) {
      console.error('No user found with customer ID:', customerId);
      return { userId: null, found: false };
    }

    const userId = response.data[0].id;
    console.log('Found user by customer ID:', userId);
    return { userId, found: true };

  } catch (error) {
    console.error('Error finding user by customer ID:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to lookup user by customer ID: ${errorMessage}`);
  }
}
