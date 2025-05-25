// app/api/create-clerk-subscription/route.js

import { NextResponse } from 'next/server';
import { clerkClient, currentUser } from '@clerk/nextjs/server';

export async function POST(request) {
    console.log('🔍 === Clerk Billing API (Enabled) ===');

    try {
        // Get authenticated user
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

        // Now that billing is enabled, try the proper Clerk billing API
        try {
            const subscription = await clerkClient.subscriptions.createSubscription({
                userId: user.id,
                planId: planId,
            });

            console.log('✅ Clerk subscription created successfully:', {
                id: subscription.id,
                hasCheckoutUrl: !!subscription.checkoutUrl,
                status: subscription.status,
                planId: subscription.planId
            });

            if (!subscription.checkoutUrl) {
                console.log('⚠️ No checkout URL provided - subscription might be free or direct');

                // Check if this was a direct activation
                return NextResponse.json({
                    success: true,
                    message: 'Subscription activated directly',
                    subscriptionId: subscription.id,
                    directActivation: true
                });
            }

            return NextResponse.json({
                success: true,
                checkoutUrl: subscription.checkoutUrl,
                subscriptionId: subscription.id
            });

        } catch (subscriptionError) {
            console.error('❌ Clerk subscription failed:', subscriptionError);
            console.error('Error details:', {
                message: subscriptionError.message,
                code: subscriptionError.code,
                status: subscriptionError.status
            });

            // Handle specific errors
            let errorMessage = 'Subscription creation failed';

            if (subscriptionError.message?.includes('not found')) {
                errorMessage = 'Plan not found. Please contact support.';
            } else if (subscriptionError.message?.includes('already exists') || subscriptionError.message?.includes('duplicate')) {
                errorMessage = 'You already have an active subscription.';
            } else if (subscriptionError.message?.includes('permission') || subscriptionError.message?.includes('unauthorized')) {
                errorMessage = 'Billing permission error. Please contact support.';
            } else if (subscriptionError.message?.includes('createSubscription')) {
                errorMessage = 'Billing API not available. Please contact support.';
            }

            return NextResponse.json({
                error: errorMessage,
                details: subscriptionError.message,
                code: subscriptionError.code
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ API Route Error:', error);
        return NextResponse.json({
            error: 'Server error: ' + error.message
        }, { status: 500 });
    }
}