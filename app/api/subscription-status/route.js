import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
    try {
        const { userId } = auth();

        if (!userId) {
            // No user is signed in.
            return NextResponse.json({ isPremium: false });
        }

        // Directly fetch the user's data from the Clerk API.
        const user = await clerkClient.users.getUser(userId);

        // Check the private metadata that your webhook sets.
        const plan = user.privateMetadata?.plan;
        const hasPremiumPlan = plan === 'llm_check_premium';

        return NextResponse.json({ isPremium: hasPremiumPlan });

    } catch (error) {
        console.error("Error fetching subscription status:", error);
        return NextResponse.json({ isPremium: false, error: "Failed to fetch status" }, { status: 500 });
    }
}