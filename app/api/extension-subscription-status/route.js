import { NextResponse } from 'next/server';
import { verifyToken, clerkClient } from '@clerk/nextjs/server';

export async function GET(request) {
    try {
        // Extension-only endpoint - requires Bearer token
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({
                isPremium: false,
                error: 'Bearer token required'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const verifiedToken = await verifyToken(token);
        const userId = verifiedToken.sub;

        console.log('🔍 Extension auth for user:', userId);

        // Check premium status from user metadata (set by your webhook)
        const user = await clerkClient.users.getUser(userId);
        const isPremium = user.publicMetadata?.premiumUser === true;

        console.log('✅ Extension subscription check:', { userId, isPremium });

        return NextResponse.json({
            isPremium,
            method: 'extension_metadata_check',
            debug: {
                userId,
                isPremium,
                metadata: user.publicMetadata,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Extension auth failed:', error);
        return NextResponse.json({
            isPremium: false,
            error: error.message,
            debug: { error: error.toString() }
        }, { status: 500 });
    }
}