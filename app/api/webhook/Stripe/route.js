import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata.userId;

                if (userId) {
                    // Update user metadata in Clerk
                    await clerkClient.users.updateUser(userId, {
                        publicMetadata: {
                            subscriptionStatus: 'active',
                            subscriptionId: session.subscription,
                            premiumUser: true,
                        },
                    });
                    console.log(`Updated user ${userId} with subscription ${session.subscription}`);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                // Find the user with this subscription ID
                const users = await clerkClient.users.getUserList({
                    query: JSON.stringify({ 'publicMetadata.subscriptionId': subscription.id }),
                });

                if (users.length > 0) {
                    const userId = users[0].id;
                    const status = subscription.status;

                    await clerkClient.users.updateUser(userId, {
                        publicMetadata: {
                            subscriptionStatus: status,
                            premiumUser: status === 'active',
                        },
                    });
                    console.log(`Updated subscription status for user ${userId} to ${status}`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                // Find the user with this subscription ID
                const users = await clerkClient.users.getUserList({
                    query: JSON.stringify({ 'publicMetadata.subscriptionId': subscription.id }),
                });

                if (users.length > 0) {
                    const userId = users[0].id;

                    await clerkClient.users.updateUser(userId, {
                        publicMetadata: {
                            subscriptionStatus: 'canceled',
                            premiumUser: false,
                        },
                    });
                    console.log(`Marked subscription as canceled for user ${userId}`);
                }
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};
