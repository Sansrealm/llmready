// API route for refreshing Clerk session and getting latest user metadata
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
    try {
        const { userId } = auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        console.log('Refreshing session for userId:', userId);

        // Force-fetch the latest user data from Clerk
        const user = await clerkClient.users.getUser(userId);

        const isPremium = user.publicMetadata.premiumUser === true;
        console.log('User premium status:', isPremium);

        return NextResponse.json({
            success: true,
            isPremium: isPremium,
            metadata: user.publicMetadata
        });
    } catch (error) {
        console.error('Error refreshing session:', error);
        return NextResponse.json(
            { error: 'Failed to refresh session: ' + error.message },
            { status: 500 }
        );
    }
}
