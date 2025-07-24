// app/api/subscription-status/route.js - Backwards Compatible Update
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
    try {
        // Use Clerk's official auth() helper (same as before)
        const { has, userId, sessionClaims } = await auth(); // Only added sessionClaims for logging

        if (!userId) {
            // EXACT SAME response structure as before
            return NextResponse.json({
                isPremium: false,
                error: 'Not authenticated'
            }, { status: 401 });
        }

        console.log('🔍 Official Clerk billing check for user:', userId);
        // NEW: Additional logging for extension-auth template (invisible to response)
        console.log('🔐 Extension auth template support active');

        // OFFICIAL METHOD: Use has() with your exact plan slug (unchanged)
        const hasPremiumPlan = has({ plan: 'llm_check_premium' });

        console.log('✅ Clerk has() result:', {
            userId,
            planSlug: 'llm_check_premium',
            hasPremiumPlan
        });

        // Return the official Clerk billing status - EXACT SAME structure as before
        return NextResponse.json({
            isPremium: hasPremiumPlan,
            method: 'clerk_billing_official', // Keep existing method field
            debug: {
                userId,
                planSlug: 'llm_check_premium',
                hasPremiumPlan,
                timestamp: new Date().toISOString(),
                // NEW: Add template info only to debug (won't break existing usage)
                ...(sessionClaims && {
                    template: 'extension-auth',
                    sessionId: sessionClaims.sid?.substring(0, 8) + '...'
                })
            }
        });

    } catch (error) {
        console.error('❌ Clerk billing check failed:', error);

        // EXACT SAME error response structure as before
        return NextResponse.json({
            isPremium: false,
            error: error.message,
            debug: {
                error: error.toString(),
                // NEW: Add template info only to debug
                template: 'extension-auth'
            }
        }, { status: 500 });
    }
}