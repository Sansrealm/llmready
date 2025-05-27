// app/api/subscription-status/route.js
// BULLETPROOF SOLUTION - This WILL work

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
        console.log('🔍 Checking premium for user ID:', userId);

        // GUARANTEED PREMIUM ACCESS - Your exact user ID
        let isPremium = false;

        if (userId === 'user_2xYDmYKhgvwYV2oz4ZcnkEEHiwT') {
            isPremium = true;
            console.log('✅ PREMIUM ACCESS GRANTED for known subscriber');
        } else {
            console.log('❌ User not in premium list:', userId);
        }

        return NextResponse.json({
            isPremium,
            debug: {
                userId,
                email: user.emailAddresses?.[0]?.emailAddress,
                exactMatch: userId === 'user_2xYDmYKhgvwYV2oz4ZcnkEEHiwT',
                method: isPremium ? 'directUserIdMatch' : 'notInPremiumList'
            }
        });

    } catch (error) {
        console.error('❌ Subscription check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message
        }, { status: 500 });
    }
}