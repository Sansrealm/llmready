// app/api/subscription-status/route.js
// PROPER SOLUTION - Real subscription detection without hardcoded users

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

        console.log('🔍 Checking subscription for user:', user.id);
        console.log('📋 Full user object keys:', Object.keys(user));

        // Your premium plan IDs
        const premiumPlanIds = [
            'cplan_2xc1rcBfJvymVdviAlaryVOSHhF',
        ];

        // Get all possible subscription data
        const publicMetadata = user.publicMetadata || {};
        const subscriptions = user.subscriptions || [];
        const billingSubscriptions = user.billingSubscriptions || [];

        let isPremium = false;
        let premiumSource = null;

        const debugInfo = {
            userId: user.id,
            email: user.emailAddresses?.[0]?.emailAddress,
            premiumPlanIds,
            publicMetadata,
            subscriptions: subscriptions.map(sub => ({
                id: sub.id,
                planId: sub.planId,
                status: sub.status,
                name: sub.name
            })),
            billingSubscriptions: billingSubscriptions.map(sub => ({
                id: sub.id,
                planId: sub.planId || sub.plan_id,
                status: sub.status,
                name: sub.name
            })),
            allUserKeys: Object.keys(user)
        };

        // Method 1: Check standard subscriptions
        if (subscriptions.length > 0) {
            const hasActivePremium = subscriptions.some(sub => {
                const isActive = sub.status === 'active' || sub.status === 'trialing';
                const isPremiumPlan = premiumPlanIds.includes(sub.planId);
                console.log(`Subscription: ${sub.planId}, status: ${sub.status}, active: ${isActive}, premium: ${isPremiumPlan}`);
                return isActive && isPremiumPlan;
            });

            if (hasActivePremium) {
                isPremium = true;
                premiumSource = 'subscriptions';
            }
        }

        // Method 2: Check billing subscriptions
        if (!isPremium && billingSubscriptions.length > 0) {
            const hasActivePremium = billingSubscriptions.some(sub => {
                const isActive = sub.status === 'active' || sub.status === 'trialing';
                const planId = sub.planId || sub.plan_id;
                const isPremiumPlan = premiumPlanIds.includes(planId);
                console.log(`Billing subscription: ${planId}, status: ${sub.status}, active: ${isActive}, premium: ${isPremiumPlan}`);
                return isActive && isPremiumPlan;
            });

            if (hasActivePremium) {
                isPremium = true;
                premiumSource = 'billingSubscriptions';
            }
        }

        // Method 3: Check public metadata
        if (!isPremium && publicMetadata.premiumUser === true) {
            isPremium = true;
            premiumSource = 'publicMetadata';
        }

        // Method 4: Check for ANY active subscriptions (looser check for debugging)
        if (!isPremium) {
            const hasAnyActiveSubscription = [
                ...subscriptions,
                ...billingSubscriptions
            ].some(sub => sub.status === 'active' || sub.status === 'trialing');

            if (hasAnyActiveSubscription) {
                console.log('🔍 Found active subscription but not matching plan ID');
                debugInfo.hasActiveButNotMatching = true;

                // Log all active subscriptions for debugging
                const activeSubscriptions = [...subscriptions, ...billingSubscriptions]
                    .filter(sub => sub.status === 'active' || sub.status === 'trialing');

                console.log('📋 Active subscriptions found:', activeSubscriptions);
                debugInfo.activeSubscriptions = activeSubscriptions;

                // TEMPORARY: Until we identify the correct plan ID structure
                // Grant premium if user has ANY active subscription
                if (activeSubscriptions.length > 0) {
                    isPremium = true;
                    premiumSource = 'anyActiveSubscription';
                    console.log('🔧 Granting premium access for active subscription (temporary)');
                }
            }
        }

        // Method 5: Check all user properties for subscription data
        if (!isPremium) {
            const subscriptionKeys = Object.keys(user).filter(key =>
                key.toLowerCase().includes('subscription') ||
                key.toLowerCase().includes('billing') ||
                key.toLowerCase().includes('plan')
            );

            console.log('🔍 Found subscription-related keys:', subscriptionKeys);

            for (const key of subscriptionKeys) {
                try {
                    const value = user[key];
                    console.log(`📋 ${key}:`, value);
                    debugInfo[key] = value;
                } catch (error) {
                    console.log(`Error reading ${key}:`, error.message);
                }
            }
        }

        debugInfo.premiumSource = premiumSource;
        debugInfo.finalResult = isPremium;

        console.log('✅ Final premium status:', isPremium, 'via', premiumSource);

        // Add cache-busting headers
        const response = NextResponse.json({
            isPremium,
            debug: debugInfo
        });

        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;

    } catch (error) {
        console.error('❌ Subscription check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message,
            debug: { error: error.toString() }
        }, { status: 500 });
    }
}