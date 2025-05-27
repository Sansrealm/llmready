// app/api/subscription-status/route.js
// Enhanced version with better debugging - PRODUCTION SAFE

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

        // Define your premium plan IDs here - ONLY these will be considered premium
        const premiumPlanIds = [
            'cplan_2xc1rcBfJvymVdviAlaryVOSHhF',  // Your current plan ID
            // Add any other premium plan IDs you might have
        ];

        console.log('📋 Looking for premium plan IDs:', premiumPlanIds);

        // Get all subscription-related data
        const metadata = user.publicMetadata || {};
        const subscriptions = user.subscriptions || [];
        const billingSubscriptions = user.billingSubscriptions || [];

        console.log('📝 Public metadata:', metadata);
        console.log('💳 User subscriptions:', subscriptions);
        console.log('💳 User billing subscriptions:', billingSubscriptions);

        // STRICT premium checks - only these specific conditions grant premium access

        // Method 1: Check regular subscriptions array for exact plan ID match
        const isPremiumFromSubscriptions = subscriptions.some(sub => {
            const isActive = sub.status === 'active';
            const isPremiumPlan = premiumPlanIds.includes(sub.planId);
            const result = isActive && isPremiumPlan;

            console.log(`🔍 Subscription check: ID=${sub.planId}, status=${sub.status}, isActive=${isActive}, isPremium=${isPremiumPlan}, result=${result}`);
            return result;
        });

        // Method 2: Check billing subscriptions array for exact plan ID match
        const isPremiumFromBillingSubscriptions = billingSubscriptions.some(sub => {
            const isActive = sub.status === 'active';
            const planId = sub.planId || sub.plan_id;
            const isPremiumPlan = premiumPlanIds.includes(planId);
            const result = isActive && isPremiumPlan;

            console.log(`🔍 Billing subscription check: ID=${planId}, status=${sub.status}, isActive=${isActive}, isPremium=${isPremiumPlan}, result=${result}`);
            return result;
        });

        // Method 3: Check metadata for explicit premium flag (manual override only)
        const hasMetadataPremium = metadata.premiumUser === true;

        // Method 4: Check for general subscription flag (as fallback)  
        const hasGeneralSubscription = user.hasSubscription === true;

        // PRODUCTION SAFE: Only grant premium if we have explicit confirmation
        const isPremium = isPremiumFromSubscriptions ||
            isPremiumFromBillingSubscriptions ||
            hasMetadataPremium;

        // Note: Removed hasGeneralSubscription from final check for stricter validation

        console.log('✅ Final subscription check result:', {
            isPremiumFromSubscriptions,
            isPremiumFromBillingSubscriptions,
            hasMetadataPremium,
            hasGeneralSubscription, // Still logged for debugging
            finalResult: isPremium
        });

        // Enhanced debugging for production troubleshooting
        const debugInfo = {
            userId: user.id,
            email: user.emailAddresses?.[0]?.emailAddress,
            premiumPlanIds,
            checks: {
                isPremiumFromSubscriptions,
                isPremiumFromBillingSubscriptions,
                hasMetadataPremium,
                hasGeneralSubscription
            },
            subscriptionDetails: subscriptions.map(sub => ({
                id: sub.id,
                planId: sub.planId,
                status: sub.status,
                name: sub.name,
                isMatchingPlan: premiumPlanIds.includes(sub.planId),
                isActive: sub.status === 'active'
            })),
            billingSubscriptionDetails: billingSubscriptions.map(sub => ({
                id: sub.id,
                planId: sub.planId || sub.plan_id,
                status: sub.status,
                name: sub.name || sub.productName,
                isMatchingPlan: premiumPlanIds.includes(sub.planId || sub.plan_id),
                isActive: sub.status === 'active'
            })),
            metadata,
            // Additional debugging - check what fields are available
            availableUserFields: Object.keys(user).filter(key =>
                key.toLowerCase().includes('subscription') ||
                key.toLowerCase().includes('billing') ||
                key.toLowerCase().includes('plan')
            )
        };

        return NextResponse.json({
            isPremium,
            debug: debugInfo
        });

    } catch (error) {
        console.error('❌ Subscription status check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message,
            debug: { error: error.toString() }
        }, { status: 500 });
    }
}