// app/api/create-clerk-subscription/route.js
// Fixed to use currentUser() instead of auth()

import { NextResponse } from 'next/server';
import { clerkClient, currentUser } from '@clerk/nextjs/server';

export async function POST(request) {
    console.log('🔍 === Clerk Subscription API ===');

    try {
        // Use currentUser() instead of auth() since that's working
        const user = await currentUser();

        if (!user) {
            console.log('❌ No authenticated user found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log('✅ User authenticated:', {
            id: user.id,
            email: user.emailAddresses?.[0]?.emailAddress
        });

        const { planId } = await request.json();

        if (!planId) {
            console.log('❌ No planId provided');
            return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
        }

        console.log('📋 Creating subscription:', {
            userId: user.id,
            planId: planId
        });

        // Create subscription using Clerk billing
        try {
            const subscription = await clerkClient.subscriptions.createSubscription({
                userId: user.id,
                planId: planId,
            });

            console.log('✅ Subscription created:', {
                id: subscription.id,
                hasCheckoutUrl: !!subscription.checkoutUrl,
                status: subscription.status
            });

            if (!subscription.checkoutUrl) {
                throw new Error('No checkout URL provided by Clerk');
            }

            return NextResponse.json({
                success: true,
                checkoutUrl: subscription.checkoutUrl,
                subscriptionId: subscription.id
            });

        } catch (subscriptionError) {
            console.error('❌ Subscription creation failed:', subscriptionError);

            // Handle specific Clerk billing errors
            let errorMessage = 'Subscription creation failed';

            if (subscriptionError.message?.includes('not found')) {
                errorMessage = 'Billing plan not found';
            } else if (subscriptionError.message?.includes('permission') || subscriptionError.message?.includes('unauthorized')) {
                errorMessage = 'Billing not enabled for this account';
            } else if (subscriptionError.message?.includes('already exists')) {
                errorMessage = 'Subscription already exists';
            }

            return NextResponse.json({
                error: errorMessage,
                details: subscriptionError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ API Error:', error);
        return NextResponse.json({
            error: 'Server error: ' + error.message
        }, { status: 500 });
    }
}