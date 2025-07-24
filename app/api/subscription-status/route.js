import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
    try {
        // Use Clerk's official auth() helper
        const { has, userId } = await auth();

        if (!userId) {
            return NextResponse.json({
                isPremium: false,
                error: 'Not authenticated'
            }, { status: 401 });
        }

        console.log('🔍 Official Clerk billing check for user:', userId);

        // OFFICIAL METHOD: Use has() with your exact plan slug
        const hasPremiumPlan = has({ plan: 'llm_check_premium' });

        console.log('✅ Clerk has() result:', {
            userId,
            planSlug: 'llm_check_premium',
            hasPremiumPlan
        });

        // Return the official Clerk billing status
        return NextResponse.json({
            isPremium: hasPremiumPlan,
            method: 'clerk_billing_official',
            debug: {
                userId,
                planSlug: 'llm_check_premium',
                hasPremiumPlan,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Clerk billing check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message,
            debug: { error: error.toString() }
        }, { status: 500 });
    }
}