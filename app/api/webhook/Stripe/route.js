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
                        const users = await clerkClient.users.getUserList({
                            emailAddress: [userEmail],
                        });

                        if (users.length > 0) {
                            userId = users[0].id;
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
                        const users = await clerkClient.users.getUserList({
                            emailAddress: [userEmail],
                        });

                        if (users.length > 0) {
                            userId = users[0].id;
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
                        return NextResponse.json(
                            { error: 'Error finding user: ' + error.message },
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

                // Update user metadata in Clerk to mark as premium
                try {
                    await clerkClient.users.updateUser(userId, {
                        publicMetadata: {
                            premiumUser: true,
                            subscriptionId: session.subscription,
                            customerId: session.customer,
                            updatedAt: new Date().toISOString(),
                        },
                    });

                    console.log('User metadata updated successfully');
                } catch (error) {
                    console.error('Error updating user metadata:', error);
                    return NextResponse.json(
                        { error: 'Error updating user metadata: ' + error.message },
                        { status: 500 }
                    );
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                console.log('Subscription updated:', subscription.id);

                // Find the user with this subscription ID
                try {
                    const users = await clerkClient.users.getUserList({
                        query: JSON.stringify({
                            publicMetadata: { subscriptionId: subscription.id },
                        }),
                    });

                    if (users.length === 0) {
                        console.error('No user found with subscription ID:', subscription.id);

                        // Try to find by customer ID as fallback
                        const customerId = subscription.customer;
                        if (customerId) {
                            const usersByCustomer = await clerkClient.users.getUserList({
                                query: JSON.stringify({
                                    publicMetadata: { customerId: customerId },
                                }),
                            });

                            if (usersByCustomer.length === 0) {
                                console.error('No user found with customer ID:', customerId);
                                return NextResponse.json(
                                    { error: 'No user found with this subscription or customer ID' },
                                    { status: 400 }
                                );
                            }

                            const userId = usersByCustomer[0].id;
                            console.log('Found user by customer ID:', userId);

                            // Update user metadata based on subscription status
                            const isActive =
                                subscription.status === 'active' ||
                                subscription.status === 'trialing';

                            await clerkClient.users.updateUser(userId, {
                                publicMetadata: {
                                    premiumUser: isActive,
                                    subscriptionStatus: subscription.status,
                                    subscriptionId: subscription.id, // Update subscription ID
                                    updatedAt: new Date().toISOString(),
                                },
                            });

                            console.log('User subscription status updated by customer ID:', isActive);
                            break;
                        }

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
                            updatedAt: new Date().toISOString(),
                        },
                    });

                    console.log('User subscription status updated:', isActive);
                } catch (error) {
                    console.error('Error updating subscription status:', error);
                    return NextResponse.json(
                        { error: 'Error updating subscription status: ' + error.message },
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
                    const users = await clerkClient.users.getUserList({
                        query: JSON.stringify({
                            publicMetadata: { subscriptionId: subscription.id },
                        }),
                    });

                    if (users.length === 0) {
                        console.error('No user found with subscription ID:', subscription.id);

                        // Try to find by customer ID as fallback
                        const customerId = subscription.customer;
                        if (customerId) {
                            const usersByCustomer = await clerkClient.users.getUserList({
                                query: JSON.stringify({
                                    publicMetadata: { customerId: customerId },
                                }),
                            });

                            if (usersByCustomer.length === 0) {
                                console.error('No user found with customer ID:', customerId);
                                return NextResponse.json(
                                    { error: 'No user found with this subscription or customer ID' },
                                    { status: 400 }
                                );
                            }

                            const userId = usersByCustomer[0].id;
                            console.log('Found user by customer ID:', userId);

                            // Update user metadata to remove premium status
                            await clerkClient.users.updateUser(userId, {
                                publicMetadata: {
                                    premiumUser: false,
                                    subscriptionStatus: 'canceled',
                                    updatedAt: new Date().toISOString(),
                                },
                            });

                            console.log('User premium status removed by customer ID');
                            break;
                        }

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
                            updatedAt: new Date().toISOString(),
                        },
                    });

                    console.log('User premium status removed');
                } catch (error) {
                    console.error('Error removing premium status:', error);
                    return NextResponse.json(
                        { error: 'Error removing premium status: ' + error.message },
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
        return NextResponse.json(
            { error: 'Webhook error: ' + error.message },
            { status: 500 }
        );
    }
}
