// API route for handling Stripe webhooks
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe webhook secret for verifying webhook events
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
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
            console.error('Webhook signature verification failed:', err.message);
            return NextResponse.json(
                { error: `Webhook signature verification failed: ${err.message}` },
                { status: 400 }
            );
        }

        // Handle specific event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('Checkout session completed:', session.id);

                // Get the userId from the client_reference_id
                const userId = session.client_reference_id;
                if (!userId) {
                    console.error('No userId found in session metadata');
                    return NextResponse.json(
                        { error: 'No userId found in session metadata' },
                        { status: 400 }
                    );
                }

                console.log('Updating user metadata for userId:', userId);

                // Update user metadata in Clerk to mark as premium
                await clerkClient.users.updateUser(userId, {
                    publicMetadata: {
                        premiumUser: true,
                        subscriptionId: session.subscription,
                        customerId: session.customer,
                    },
                });

                console.log('User metadata updated successfully');
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                console.log('Subscription updated:', subscription.id);

                // Find the user with this subscription ID
                const users = await clerkClient.users.getUserList({
                    query: JSON.stringify({
                        publicMetadata: { subscriptionId: subscription.id },
                    }),
                });

                if (users.length === 0) {
                    console.error('No user found with subscription ID:', subscription.id);
                    return NextResponse.json(
                        { error: 'No user found with this subscription ID' },
                        { status: 400 }
                    );
                }

                const userId = users[0].id;
                console.log('Found user with subscription:', userId);

                // Update user metadata based on subscription status
                const isActive =
                    subscription.status === 'active' ||
                    subscription.status === 'trialing';

                await clerkClient.users.updateUser(userId, {
                    publicMetadata: {
                        premiumUser: isActive,
                        subscriptionStatus: subscription.status,
                    },
                });

                console.log('User subscription status updated:', isActive);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                console.log('Subscription deleted:', subscription.id);

                // Find the user with this subscription ID
                const users = await clerkClient.users.getUserList({
                    query: JSON.stringify({
                        publicMetadata: { subscriptionId: subscription.id },
                    }),
                });

                if (users.length === 0) {
                    console.error('No user found with subscription ID:', subscription.id);
                    return NextResponse.json(
                        { error: 'No user found with this subscription ID' },
                        { status: 400 }
                    );
                }

                const userId = users[0].id;
                console.log('Found user with subscription:', userId);

                // Update user metadata to remove premium status
                await clerkClient.users.updateUser(userId, {
                    publicMetadata: {
                        premiumUser: false,
                        subscriptionStatus: 'canceled',
                    },
                });

                console.log('User premium status removed');
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json(
            { error: 'Webhook error: ' + error.message },
            { status: 500 }
        );
    }
}
