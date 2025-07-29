import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
    try {
        const { userId, has } = auth();

        if (!userId) {
            return NextResponse.json({ isPremium: false });
        }

        // --- METHOD 1: Try the standard session-based check first ---
        // This should work for your web app.
        if (has({ plan: 'llm_check_premium' })) {
            console.log('✅ Premium status confirmed via has() helper.');
            return NextResponse.json({ isPremium: true });
        }

        // --- METHOD 2: Fallback to a direct API check ---
        // This is the robust method for the extension or if the has() helper fails.
        console.log('has() returned false. Falling back to direct clerkClient lookup.');
        const user = await clerkClient.users.getUser(userId);
        const plan = user.privateMetadata?.plan;

        if (plan === 'llm_check_premium') {
            console.log('✅ Premium status confirmed via privateMetadata.');
            return NextResponse.json({ isPremium: true });
        }

        // If both checks fail, the user is not premium.
        console.log('❌ User is not premium after both checks.');
        return NextResponse.json({ isPremium: false });

    } catch (error) {
        console.error("Error fetching subscription status:", error);
        return NextResponse.json({ isPremium: false, error: "Failed to fetch status" }, { status: 500 });
    }
}