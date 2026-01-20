// app/api/cancel-subscription/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/cancel-subscription
 *
 * Cancels a user's Stripe subscription.
 * Verifies that the user owns the subscription before canceling.
 * The webhook will handle updating Clerk metadata after cancellation.
 *
 * Request body (optional):
 * {
 *   "subscriptionId": "sub_xxxxx",  // Optional: if not provided, uses user's metadata
 *   "cancelAtPeriodEnd": true        // Optional: if true, cancels at end of billing period
 * }
 */
export async function POST(request) {
  try {
    // Get authentication status from Clerk
    const { userId } = await auth();

    if (!userId) {
      console.error('Unauthorized cancellation attempt - no userId');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`🔍 Processing cancellation request for user: ${userId}`);

    // Get the user's metadata from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = user.publicMetadata || {};

    // Parse request body (if provided)
    let requestBody = {};
    try {
      const text = await request.text();
      if (text) {
        requestBody = JSON.parse(text);
      }
    } catch (parseError) {
      console.log('No request body provided, will use user metadata');
    }

    // Get subscription ID from request body or user metadata
    const subscriptionId = requestBody.subscriptionId || metadata.subscriptionId;

    if (!subscriptionId) {
      console.error(`No subscription found for user ${userId}`);
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    console.log(`📋 Found subscription ID: ${subscriptionId}`);

    // Verify the subscription belongs to this user
    if (metadata.subscriptionId && metadata.subscriptionId !== subscriptionId) {
      console.error(
        `Permission denied: User ${userId} attempted to cancel subscription ${subscriptionId} but owns ${metadata.subscriptionId}`
      );
      return NextResponse.json(
        { error: 'You do not have permission to cancel this subscription' },
        { status: 403 }
      );
    }

    // Verify subscription exists in Stripe
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`✅ Subscription found in Stripe: ${subscription.id}, status: ${subscription.status}`);
    } catch (stripeError) {
      console.error(`Stripe subscription not found: ${subscriptionId}`, stripeError);
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if subscription is already canceled
    if (subscription.status === 'canceled') {
      console.log(`Subscription ${subscriptionId} is already canceled`);
      return NextResponse.json(
        { error: 'Subscription is already canceled' },
        { status: 400 }
      );
    }

    // Determine cancellation mode
    const cancelAtPeriodEnd = requestBody.cancelAtPeriodEnd === true;

    // Cancel the subscription in Stripe
    try {
      console.log(
        `🚫 Canceling subscription ${subscriptionId} (cancelAtPeriodEnd: ${cancelAtPeriodEnd})`
      );

      let canceledSubscription;
      if (cancelAtPeriodEnd) {
        // Cancel at the end of the billing period
        canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        console.log(
          `✅ Subscription will cancel at period end: ${new Date(canceledSubscription.current_period_end * 1000).toISOString()}`
        );
      } else {
        // Cancel immediately
        canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
        console.log(`✅ Subscription canceled immediately`);
      }

      // Stripe will send a webhook (customer.subscription.deleted or customer.subscription.updated)
      // The webhook handler will update the Clerk metadata
      console.log(`✅ Cancellation successful. Webhook will update user metadata.`);

      return NextResponse.json({
        success: true,
        message: cancelAtPeriodEnd
          ? 'Subscription will be canceled at the end of the billing period'
          : 'Subscription canceled successfully',
        subscription: {
          id: canceledSubscription.id,
          status: canceledSubscription.status,
          cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
          currentPeriodEnd: canceledSubscription.current_period_end
            ? new Date(canceledSubscription.current_period_end * 1000).toISOString()
            : null,
        },
      });
    } catch (stripeError) {
      console.error(`Stripe cancellation failed for ${subscriptionId}:`, stripeError);
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown error';

      // Don't expose internal Stripe errors to client
      return NextResponse.json(
        { error: 'Failed to cancel subscription. Please try again or contact support.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Don't expose internal errors to client
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again.' },
      { status: 500 }
    );
  }
}