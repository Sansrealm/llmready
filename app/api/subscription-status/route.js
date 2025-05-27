// app/api/subscription-status/route.js
// COMPREHENSIVE DEBUG - This will show us EVERYTHING Clerk provides

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({
                isPremium: false,
                error: 'Not authenticated'
            }, { status: 401 });
        }

        console.log('🔍 FULL USER OBJECT DEBUG for user:', user.id);

        // Log the ENTIRE user object to see what Clerk actually provides
        console.log('📋 Complete user object keys:', Object.keys(user));
        console.log('📋 Complete user object:', JSON.stringify(user, null, 2));

        // Define premium plan IDs
        const premiumPlanIds = [
            'cplan_2xc1rcBfJvymVdviAlaryVOSHhF',
        ];

        // Extract all possible subscription-related data
        const subscriptions = user.subscriptions || [];
        const billingSubscriptions = user.billingSubscriptions || [];
        const publicMetadata = user.publicMetadata || {};
        const privateMetadata = user.privateMetadata || {};
        const unsafeMetadata = user.unsafeMetadata || {};

        // Check for any property that might contain subscription info
        const allUserProps = {};
        for (const [key, value] of Object.entries(user)) {
            if (key.toLowerCase().includes('sub') ||
                key.toLowerCase().includes('bill') ||
                key.toLowerCase().includes('plan') ||
                key.toLowerCase().includes('premium') ||
                key.toLowerCase().includes('active')) {
                allUserProps[key] = value;
            }
        }

        // Multiple premium check methods
        const checks = {
            // Method 1: Standard subscription check
            subscriptions: subscriptions.some(sub =>
                sub.status === 'active' && premiumPlanIds.includes(sub.planId)
            ),

            // Method 2: Billing subscription check
            billingSubscriptions: billingSubscriptions.some(sub =>
                sub.status === 'active' && premiumPlanIds.includes(sub.planId || sub.plan_id)
            ),

            // Method 3: Any active subscription (looser check)
            anyActiveSubscription: [
                ...subscriptions,
                ...billingSubscriptions
            ].some(sub => sub.status === 'active'),

            // Method 4: hasSubscription property
            hasSubscriptionProp: user.hasSubscription === true,

            // Method 5: Metadata checks
            publicMetadataPremium: publicMetadata.premiumUser === true,
            privateMetadataPremium: privateMetadata.premiumUser === true,
            unsafeMetadataPremium: unsafeMetadata.premiumUser === true,

            // Method 6: Check for any subscription-like properties
            hasSubscriptionProps: Object.keys(user).some(key =>
                key.toLowerCase().includes('subscription') && user[key]
            )
        };

        // TEMPORARY: Use any active subscription as premium indicator
        // This is for debugging only - we'll make it stricter once we find the data
        const isPremium = checks.anyActiveSubscription ||
            checks.hasSubscriptionProp ||
            checks.publicMetadataPremium;

        console.log('✅ Comprehensive check results:', checks);
        console.log('🎯 Final premium status:', isPremium);

        return NextResponse.json({
            isPremium,
            debug: {
                userId: user.id,
                email: user.emailAddresses?.[0]?.emailAddress,

                // All user object keys for debugging
                allUserKeys: Object.keys(user),

                // Subscription-related properties
                subscriptionRelatedProps: allUserProps,

                // Standard arrays
                subscriptions: subscriptions.map(sub => ({
                    id: sub.id,
                    planId: sub.planId,
                    status: sub.status,
                    name: sub.name,
                    allProps: sub
                })),

                billingSubscriptions: billingSubscriptions.map(sub => ({
                    id: sub.id,
                    planId: sub.planId || sub.plan_id,
                    status: sub.status,
                    name: sub.name,
                    allProps: sub
                })),

                // Metadata
                publicMetadata,
                privateMetadata,
                unsafeMetadata,

                // All check results
                checks,

                // Raw user object (be careful with sensitive data)
                rawUserObject: user
            }
        });

    } catch (error) {
        console.error('❌ Debug check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message,
            debug: { error: error.toString() }
        }, { status: 500 });
    }
}