// Fixed app/api/extension-subscription-status/route.js with better error handling

import { NextResponse } from 'next/server';
import { verifyToken, clerkClient } from '@clerk/nextjs/server';

export async function GET(request) {
    // TEMPORARY DEBUG - Remove after fixing
    console.log('🔍 Server environment check:', {
        clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...',
        hasSecretKey: !!process.env.CLERK_SECRET_KEY,
        nodeEnv: process.env.NODE_ENV
    });

    console.log('🔍 Extension subscription status API called');

    try {
        // Extension-only endpoint - requires Bearer token
        const authHeader = request.headers.get('authorization');
        console.log('🔒 Auth header present:', !!authHeader);

        if (!authHeader?.startsWith('Bearer ')) {
            console.log('❌ No Bearer token provided');
            return NextResponse.json({
                isPremium: false,
                error: 'Bearer token required',
                debug: { authHeaderPresent: !!authHeader, authHeaderStart: authHeader?.substring(0, 10) }
            }, { status: 401 });
        }
        const token = authHeader.substring(7);
        console.log('🔑 Token extracted, length:', token.length);

        // More detailed token verification with better error handling
        let verifiedToken;
        let userId;

        try {
            console.log('🔐 Attempting token verification...');
            verifiedToken = await verifyToken(token, {
                // Add any specific options if needed
                issuer: (iss) => iss.includes('clerk'),
            });
            userId = verifiedToken.sub;
            console.log('✅ Token verified successfully for user:', userId);
        } catch (tokenError) {
            console.error('❌ Token verification failed:', {
                error: tokenError.message,
                name: tokenError.name,
                tokenLength: token.length,
                tokenStart: token.substring(0, 20) + '...'
            });

            return NextResponse.json({
                isPremium: false,
                error: 'Invalid or expired token',
                debug: {
                    tokenError: tokenError.message,
                    tokenLength: token.length,
                    timestamp: new Date().toISOString()
                }
            }, { status: 401 });
        }

        if (!userId) {
            console.error('❌ No userId found in token');
            return NextResponse.json({
                isPremium: false,
                error: 'Invalid token payload',
                debug: { verifiedToken: !!verifiedToken, userId: null }
            }, { status: 401 });
        }

        console.log('🔍 Fetching user data for:', userId);

        // Get user with better error handling
        let user;
        try {
            user = await clerkClient.users.getUser(userId);
            console.log('✅ User data retrieved:', {
                id: user.id,
                hasMetadata: !!user.publicMetadata,
                metadataKeys: Object.keys(user.publicMetadata || {})
            });
        } catch (userError) {
            console.error('❌ Failed to fetch user:', userError.message);
            return NextResponse.json({
                isPremium: false,
                error: 'User not found',
                debug: { userId, userError: userError.message }
            }, { status: 404 });
        }

        // Check premium status from user metadata (set by your webhook)
        const isPremium = user.publicMetadata?.premiumUser === true;

        console.log('✅ Extension subscription check result:', {
            userId,
            isPremium,
            metadata: user.publicMetadata
        });

        return NextResponse.json({
            isPremium,
            method: 'extension_metadata_check',
            debug: {
                userId,
                isPremium,
                metadata: user.publicMetadata,
                timestamp: new Date().toISOString(),
                tokenVerified: true
            }
        });

    } catch (error) {
        console.error('❌ Unexpected extension auth error:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });

        return NextResponse.json({
            isPremium: false,
            error: 'Internal server error',
            debug: {
                error: error.toString(),
                message: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}
