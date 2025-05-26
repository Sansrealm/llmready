// app/api/subscription-status/route.js
// Updated to check for specific plan IDs

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function GET() {
    try {
        // Get current user server-side
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({
                isPremium: false,
                error: 'Not authenticated'
            }, { status: 401 });
        }

        console.log('🔍 Checking subscription for user:', user.id);

        // Define your premium plan IDs here
        const premiumPlanIds = [
            'cplan_2xc1rcBfJvymVdviAlaryVOSHhF',  // Your new plan ID
            // Add any other premium plan IDs you might have
        ];

        console.log('📋 Looking for premium plan IDs:', premiumPlanIds);

        // Method 1: Check public metadata for plan information
        const metadata = user.publicMetadata || {};
        console.log('📝 Public metadata:', metadata);

        // Method 2: Check if Clerk stores subscription info in user object
        const subscriptions = user.subscriptions || [];
        const billingSubscriptions = user.billingSubscriptions || [];

        console.log('💳 User subscriptions:', subscriptions);
        console.log('💳 User billing subscriptions:', billingSubscriptions);

        // Method 3: Check for active premium subscriptions by plan ID
        let isPremiumFromSubscriptions = false;

        // Check regular subscriptions array
        if (subscriptions && subscriptions.length > 0) {
            isPremiumFromSubscriptions = subscriptions.some(sub => {
                const isActivePremium = sub.status === 'active' && premiumPlanIds.includes(sub.planId);
                console.log(`🔍 Checking subscription: ${sub.planId}, status: ${sub.status}, isPremium: ${isActivePremium}`);
                return isActivePremium;
            });
        }

        // Check billing subscriptions array if regular subscriptions don't have the info
        if (!isPremiumFromSubscriptions && billingSubscriptions && billingSubscriptions.length > 0) {
            isPremiumFromSubscriptions = billingSubscriptions.some(sub => {
                const isActivePremium = sub.status === 'active' && premiumPlanIds.includes(sub.planId || sub.plan_id);
                console.log(`🔍 Checking billing subscription: ${sub.planId || sub.plan_id}, status: ${sub.status}, isPremium: ${isActivePremium}`);
                return isActivePremium;
            });
        }

        // Method 4: Check metadata for premium status (fallback)
        const hasMetadataPremium = metadata.premiumUser === true;

        // Method 5: Check for general subscription properties
        const hasGeneralSubscription = user.hasSubscription === true;

        // Final determination
        const isPremium = isPremiumFromSubscriptions || hasMetadataPremium || hasGeneralSubscription;

        console.log('✅ Final subscription check result:', {
            isPremiumFromSubscriptions,
            hasMetadataPremium,
            hasGeneralSubscription,
            finalResult: isPremium
        });

        return NextResponse.json({
            isPremium,
            userId: user.id,
            debug: {
                premiumPlanIds,
                isPremiumFromSubscriptions,
                hasMetadataPremium,
                hasGeneralSubscription,
                subscriptions,
                billingSubscriptions,
                metadata,
                serverUserKeys: Object.keys(user),
                subscriptionProps: Object.keys(user).filter(key =>
                    key.toLowerCase().includes('subscription') ||
                    key.toLowerCase().includes('billing') ||
                    key.toLowerCase().includes('plan')
                ),
            }
        });

    } catch (error) {
        console.error('❌ Subscription status check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message
        }, { status: 500 });
    }
}