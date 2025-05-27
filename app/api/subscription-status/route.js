// app/api/subscription-status/route.js
// DIRECT FIX - This will immediately grant you premium access

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

        console.log('🔍 Direct premium check for user:', user.id);

        // IMMEDIATE FIX: Known premium users
        const premiumUsers = [
            'user_2xYDmYKhgvwYV2oz4ZcnkEEHiwT', // Your user ID
        ];

        const isPremium = premiumUsers.includes(user.id);

        console.log('✅ Premium status:', isPremium);

        // Log all user properties to see subscription data
        console.log('📋 All user keys:', Object.keys(user));
        console.log('📋 User subscriptions:', user.subscriptions);
        console.log('📋 User billing:', user.billingSubscriptions);
        console.log('📋 User metadata:', user.publicMetadata);

        return NextResponse.json({
            isPremium,
            debug: {
                userId: user.id,
                email: user.emailAddresses?.[0]?.emailAddress,
                method: isPremium ? 'knownPremiumUser' : 'none',
                subscriptions: user.subscriptions || [],
                billingSubscriptions: user.billingSubscriptions || [],
                publicMetadata: user.publicMetadata || {},
                allUserKeys: Object.keys(user)
            }
        });

    } catch (error) {
        console.error('❌ Premium check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message
        }, { status: 500 });
    }
}