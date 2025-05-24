import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, clerkClient } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const { userId } = auth();

        // Check if user is authenticated
        if (!userId) {
            return NextResponse.json(
                { error: 'You must be logged in to manage your subscription' },
                { status: 401 }
            );
        }

        // Get user data from Clerk
        const user = await clerkClient.users.getUser(userId);
        const subscriptionId = user.publicMetadata.subscriptionId;

        if (!subscriptionId) {
            return NextResponse.json(
                { error: 'No subscription found for this user' },
                { status: 400 }
            );
        }

        // Retrieve the subscription to get the customer ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = subscription.customer;

        // Create a billing portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Error creating portal session:', error);
        return NextResponse.json(
            { error: 'Failed to create portal session' },
            { status: 500 }
        );
    }
}
