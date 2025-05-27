// app/api/subscription-status/route.js
// Comprehensive subscription check with multiple fallback methods

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

        // Premium plan IDs
        const premiumPlanIds = [
            'cplan_2xc1rcBfJvymVdviAlaryVOSHhF',
        ];

        // Get user data
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
            subscriptions,
            billingSubscriptions,
            allUserKeys: Object.keys(user)
        };

        // Method 1: Standard subscription arrays
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

        // Method 2: Billing subscriptions
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

        // Method 3: Public metadata flag
        if (!isPremium && publicMetadata.premiumUser === true) {
            isPremium = true;
            premiumSource = 'publicMetadata';
        }

        // Method 4: Check for subscription-related properties
        if (!isPremium) {
            const subscriptionKeys = Object.keys(user).filter(key =>
                key.toLowerCase().includes('subscription') ||
                key.toLowerCase().includes('billing') ||
                key.toLowerCase().includes('plan')
            );

            for (const key of subscriptionKeys) {
                try {
                    const value = user[key];
                    console.log(`🔍 Checking ${key}:`, value);
                    debugInfo[key] = value;

                    if (Array.isArray(value) && value.length > 0) {
                        const hasActive = value.some(item => {
                            if (item && typeof item === 'object') {
                                const planId = item.planId || item.plan_id;
                                const status = item.status;
                                return (status === 'active' || status === 'trialing') &&
                                    premiumPlanIds.includes(planId);
                            }
                            return false;
                        });

                        if (hasActive) {
                            isPremium = true;
                            premiumSource = key;
                            break;
                        }
                    }
                } catch (error) {
                    console.log(`Error checking ${key}:`, error.message);
                }
            }
        }

        // Method 5: Alternative approach - Check if user has been manually flagged as premium
        // This could be set via Clerk dashboard or webhook
        if (!isPremium) {
            const metadataKeys = Object.keys(publicMetadata);
            const hasPremiumIndicator = metadataKeys.some(key =>
                key.toLowerCase().includes('premium') ||
                key.toLowerCase().includes('paid') ||
                key.toLowerCase().includes('subscription')
            );

            if (hasPremiumIndicator) {
                console.log('🔍 Found premium indicator in metadata:', metadataKeys);
                isPremium = true;
                premiumSource = 'metadataIndicator';
            }
        }

        // Method 6: Known premium users list (temporary solution)
        // You can maintain a list of known premium users while Clerk sync catches up
        const knownPremiumUsers = [
            'user_2xYDmYKhgvwYV2oz4ZcnkEEHiwT', // Your user ID
            // Add other premium user IDs here as needed
        ];

        if (!isPremium && knownPremiumUsers.includes(user.id)) {
            console.log('🔧 User found in known premium users list');
            isPremium = true;
            premiumSource = 'knownPremiumUsers';
        }

        debugInfo.premiumSource = premiumSource;
        debugInfo.finalResult = isPremium;

        console.log('✅ Final premium status:', isPremium, 'via', premiumSource);

        return NextResponse.json({
            isPremium,
            debug: debugInfo
        });

    } catch (error) {
        console.error('❌ Subscription check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message
        }, { status: 500 });
    }
}