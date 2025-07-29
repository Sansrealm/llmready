import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
    try {
        const { has, userId } = await auth();

        if (!userId) {
            return NextResponse.json({
                isPremium: false,
                error: 'Not authenticated'
            }, { status: 401 });
        }

        // Define an array of all possible "premium" plan slugs
        const premiumPlanSlugs = [
            'llm_check_premium',          // Your public plan
            'prem01'      // 👈 Replace this with the slug for your private $1 plan
        ];

        // Check if the user has an active subscription for ANY of the plans in the array
        const hasPremiumPlan = has({ plan: premiumPlanSlugs });

        console.log('✅ Clerk multi-plan check result:', {
            userId,
            checkedSlugs: premiumPlanSlugs,
            hasPremiumPlan
        });

        // Return the final, accurate billing status
        return NextResponse.json({
            isPremium: hasPremiumPlan,
            method: 'clerk_multi_plan_check'
        });

    } catch (error) {
        console.error('❌ Clerk billing check failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message
        }, { status: 500 });
    }
}