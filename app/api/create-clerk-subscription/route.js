// app/api/create-clerk-subscription/route.js
// Fixed - removed TypeScript syntax for JavaScript file

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planId } = await request.json();
        console.log('Creating Clerk subscription for user:', userId, 'Plan:', planId);

        // Create subscription using Clerk's billing API
        const subscription = await clerkClient.subscriptions.createSubscription({
            userId,
            planId,
        });

        console.log('Subscription created:', subscription);

        return NextResponse.json({
            success: true,
            checkoutUrl: subscription.checkoutUrl,
            subscriptionId: subscription.id
        });

    } catch (error) {
        // Fixed: removed ": any" type annotation
        console.error('Error creating Clerk subscription:', error);
        return NextResponse.json(
            { error: 'Failed to create subscription: ' + error.message },
            { status: 500 }
        );
    }
}