// API route for handling Stripe webhooks
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { findUserByStripeSubscription, findUserByStripeCustomer } from '@/lib/stripe-utils';
import { addToRetryQueue, type WebhookMetadata } from '@/lib/queue/webhook-retry';
import PremiumWelcomeEmail from '@/emails/premium-welcome';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stripe webhook secret for verifying webhook events
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
    console.log('Webhook event received');

    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature || !endpointSecret) {
            console.error('Missing signature or endpoint secret');
            return NextResponse.json(
                { error: 'Webhook signature verification failed' },
                { status: 400 }
            );
        }

        // Verify the event came from Stripe
        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
            console.log('Webhook verified, event type:', event.type);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('Webhook signature verification failed:', errorMessage);
            return NextResponse.json(
                { error: `Webhook signature verification failed: ${errorMessage}` },
                { status: 400 }
            );
        }

        // Handle specific event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('Checkout session completed:', session.id);

                // Get the userId from the client_reference_id
                const clientReferenceId = session.client_reference_id;
                console.log('Client reference ID:', clientReferenceId);

                // Check if this is a userId or an email-based ID
                let userId;
                let userEmail;

                if (clientReferenceId && clientReferenceId.startsWith('email:')) {
                    // This is an email-based ID
                    userEmail = clientReferenceId.substring(6); // Remove 'email:' prefix
                    console.log('Email-based ID detected, email:', userEmail);

                    // Find user by email
                    try {
                        const client = await clerkClient();
                        const response = await client.users.getUserList({
                            emailAddress: [userEmail],
                        });

                        if (response.data && response.data.length > 0) {
                            userId = response.data[0].id;
                            console.log('Found user by email:', userId);
                        } else {
                            console.error('No user found with email:', userEmail);
                            return NextResponse.json(
                                { error: 'No user found with this email' },
                                { status: 400 }
                            );
                        }
                    } catch (error) {
                        console.error('Error finding user by email:', error);
                        // Continue with customer email as fallback
                    }
                } else if (clientReferenceId) {
                    // This is a regular userId
                    userId = clientReferenceId;
                    console.log('Using provided userId:', userId);
                } else {
                    // No client reference ID, try to use customer email
                    userEmail = session.customer_email;
                    console.log('No client reference ID, using customer email:', userEmail);

                    if (!userEmail) {
                        console.error('No userId or email found in session');
                        return NextResponse.json(
                            { error: 'No userId or email found in session' },
                            { status: 400 }
                        );
                    }

                    // Find user by email
                    try {
                        const client = await clerkClient();
                        const response = await client.users.getUserList({
                            emailAddress: [userEmail],
                        });

                        if (response.data && response.data.length > 0) {
                            userId = response.data[0].id;
                            console.log('Found user by customer email:', userId);
                        } else {
                            console.error('No user found with customer email:', userEmail);
                            return NextResponse.json(
                                { error: 'No user found with this email' },
                                { status: 400 }
                            );
                        }
                    } catch (error) {
                        console.error('Error finding user by customer email:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        return NextResponse.json(
                            { error: 'Error finding user: ' + errorMessage },
                            { status: 500 }
                        );
                    }
                }

                if (!userId) {
                    console.error('Could not determine userId from session data');
                    return NextResponse.json(
                        { error: 'Could not determine userId from session data' },
                        { status: 400 }
                    );
                }

                console.log('Updating user metadata for userId:', userId);

                // Hoist user so it's accessible for the email guard below
                const client = await clerkClient();
                let user: Awaited<ReturnType<typeof client.users.getUser>> | null = null;

                // Update user metadata in Clerk to mark as premium
                try {
                    user = await client.users.getUser(userId);
                    await client.users.updateUser(userId, {
                        publicMetadata: {
                            ...user.publicMetadata,
                            premiumUser: true,
                            subscriptionId: session.subscription,
                            customerId: session.customer,
                            updatedAt: new Date().toISOString(),
                        },
                    });

                    console.log('User metadata updated successfully');
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`❌ Failed to update Clerk metadata for ${userId}:`, errorMessage);

                    // Add to retry queue
                    addToRetryQueue(userId, {
                        premiumUser: true,
                        subscriptionId: session.subscription as string,
                        customerId: session.customer as string,
                        updatedAt: new Date().toISOString(),
                    }, errorMessage);

                    console.log(`➕ Added to retry queue: ${userId}`);
                    // Continue processing - webhook will still return 200 to Stripe
                }

                // Fire-and-forget welcome email — does not block webhook response
                // Guard: new subscriptions only (not renewals) and not already premium
                // user === null means the metadata fetch threw; treat as not premium
                // to avoid missing a genuine new subscriber
                if (
                    session.mode === 'subscription' &&
                    user?.publicMetadata?.premiumUser !== true
                ) {
                    const welcomeToEmail =
                        session.customer_details?.email ??
                        session.customer_email ??
                        userEmail;

                    if (welcomeToEmail) {
                        const firstName =
                            session.customer_details?.name?.split(' ')[0] ?? 'there';
                        const resend = new Resend(process.env.RESEND_API_KEY);
                        (async () => {
                            const emailHtml = await render(PremiumWelcomeEmail({ firstName }));
                            await resend.emails.send({
                                from: 'LLM Check <analysis@llmcheck.app>',
                                to: welcomeToEmail,
                                subject: 'Welcome to LLM Check — start here',
                                html: emailHtml,
                            });
                        })().catch((err: unknown) =>
                            console.error('Welcome email failed:', err)
                        );
                        console.log(`📧 Welcome email queued for ${welcomeToEmail}`);
                    } else {
                        console.warn('Welcome email skipped: no customer email available for this session');
                    }
                } else {
                    console.log('Welcome email skipped: renewal or already premium user');
                }

                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                console.log('Subscription updated:', subscription.id);

                // Find the user with this subscription ID
                try {
                    // Try to find by subscription ID first
                    let result = await findUserByStripeSubscription(subscription.id);

                    // Fallback to customer ID if not found
                    if (!result.found && subscription.customer) {
                        const customerId = typeof subscription.customer === 'string'
                            ? subscription.customer
                            : subscription.customer.id;
                        result = await findUserByStripeCustomer(customerId);
                    }

                    // If still not found, return error
                    if (!result.found) {
                        return NextResponse.json(
                            { error: 'No user found with this subscription or customer ID' },
                            { status: 400 }
                        );
                    }

                    const userId = result.userId!;

                    // Update user metadata based on subscription status
                    const isActive =
                        subscription.status === 'active' ||
                        subscription.status === 'trialing';

                    // Try to update Clerk metadata
                    try {
                        const client = await clerkClient();
                        const user = await client.users.getUser(userId);
                        await client.users.updateUser(userId, {
                            publicMetadata: {
                                ...user.publicMetadata,
                                premiumUser: isActive,
                                subscriptionStatus: subscription.status,
                                subscriptionId: subscription.id,
                                updatedAt: new Date().toISOString(),
                            },
                        });

                        console.log('User subscription status updated:', isActive);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        console.error(`❌ Failed to update Clerk metadata for ${userId}:`, errorMessage);

                        // Add to retry queue
                        addToRetryQueue(userId, {
                            premiumUser: isActive,
                            subscriptionStatus: subscription.status,
                            subscriptionId: subscription.id,
                            updatedAt: new Date().toISOString(),
                        }, errorMessage);

                        console.log(`➕ Added to retry queue: ${userId}`);
                        // Continue processing - webhook will still return 200 to Stripe
                    }
                } catch (error) {
                    console.error('Error updating subscription status:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return NextResponse.json(
                        { error: 'Error updating subscription status: ' + errorMessage },
                        { status: 500 }
                    );
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                console.log('Subscription deleted:', subscription.id);

                // Find the user with this subscription ID
                try {
                    // Try to find by subscription ID first
                    let result = await findUserByStripeSubscription(subscription.id);

                    // Fallback to customer ID if not found
                    if (!result.found && subscription.customer) {
                        const customerId = typeof subscription.customer === 'string'
                            ? subscription.customer
                            : subscription.customer.id;
                        result = await findUserByStripeCustomer(customerId);
                    }

                    // If still not found, return error
                    if (!result.found) {
                        return NextResponse.json(
                            { error: 'No user found with this subscription or customer ID' },
                            { status: 400 }
                        );
                    }

                    const userId = result.userId!;

                    // Update user metadata to remove premium status
                    try {
                        const client = await clerkClient();
                        const user = await client.users.getUser(userId);
                        await client.users.updateUser(userId, {
                            publicMetadata: {
                                ...user.publicMetadata,
                                premiumUser: false,
                                subscriptionStatus: 'canceled',
                                updatedAt: new Date().toISOString(),
                            },
                        });

                        console.log('User premium status removed');
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        console.error(`❌ Failed to update Clerk metadata for ${userId}:`, errorMessage);

                        // Add to retry queue
                        addToRetryQueue(userId, {
                            premiumUser: false,
                            subscriptionStatus: 'canceled',
                            updatedAt: new Date().toISOString(),
                        }, errorMessage);

                        console.log(`➕ Added to retry queue: ${userId}`);
                        // Continue processing - webhook will still return 200 to Stripe
                    }
                } catch (error) {
                    console.error('Error removing premium status:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return NextResponse.json(
                        { error: 'Error removing premium status: ' + errorMessage },
                        { status: 500 }
                    );
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Webhook error: ' + errorMessage },
            { status: 500 }
        );
    }
}
