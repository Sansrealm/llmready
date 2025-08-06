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

        // 🎯 FIX: Check both possible metadata keys for compatibility
        const isPremiumFromPremiumUser = user.publicMetadata?.premiumUser === true;
        const isPremiumFromIsPremium = user.publicMetadata?.isPremium === true;
        const isPremium = isPremiumFromPremiumUser || isPremiumFromIsPremium;

        console.log('✅ Extension subscription check:', {
            userId,
            isPremium,
            premiumUser: isPremiumFromPremiumUser,
            isPremiumFlag: isPremiumFromIsPremium,
            allMetadata: user.publicMetadata
        });

        // 🔧 SYNC FIX: If we have premiumUser=true but not isPremium=true, sync them
        if (isPremiumFromPremiumUser && !isPremiumFromIsPremium) {
            try {
                console.log('🔄 Syncing metadata keys for consistency...');
                await clerkClient.users.updateUser(userId, {
                    publicMetadata: {
                        ...user.publicMetadata,
                        isPremium: true, // Add the isPremium flag for consistency
                    },
                });
                console.log('✅ Metadata keys synced');
            } catch (syncError) {
                console.error('❌ Failed to sync metadata:', syncError);
            }
        }

        return NextResponse.json({
            isPremium,
            method: 'extension_metadata_check',
            debug: {
                userId,
                isPremium,
                premiumUser: isPremiumFromPremiumUser,
                isPremiumFlag: isPremiumFromIsPremium,
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