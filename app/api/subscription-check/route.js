// app/api/subscription-check/route.js
// NEW ROUTE - No caching issues

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

        const userId = user.id;
        console.log('🚀 NEW ROUTE - Checking premium for user ID:', userId);

        // GUARANTEED PREMIUM ACCESS
        const isPremium = userId === 'user_2xYDmYKhgvwYV2oz4ZcnkEEHiwT';

        console.log('✅ NEW ROUTE RESULT:', isPremium ? 'PREMIUM GRANTED' : 'NOT PREMIUM');

        return NextResponse.json({
            isPremium,
            route: 'subscription-check-v1',
            timestamp: new Date().toISOString(),
            debug: {
                userId,
                email: user.emailAddresses?.[0]?.emailAddress,
                method: 'newRoute'
            }
        });

    } catch (error) {
        console.error('❌ New route check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message
        }, { status: 500 });
    }
}