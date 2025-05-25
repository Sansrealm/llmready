// app/api/test-auth/route.js

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
    console.log('🔍 Testing Clerk Authentication...');

    try {
        // Test auth() function
        const { userId, sessionId } = auth();
        console.log('auth() result:', { userId, sessionId });

        // Test currentUser() function
        let user = null;
        try {
            user = await currentUser();
            console.log('currentUser() result:', user ? {
                id: user.id,
                email: user.emailAddresses?.[0]?.emailAddress
            } : 'null');
        } catch (userError) {
            console.log('currentUser() failed:', userError.message);
        }

        return NextResponse.json({
            success: true,
            authUserId: userId || null,
            sessionId: sessionId || null,
            currentUserId: user?.id || null,
            email: user?.emailAddresses?.[0]?.emailAddress || null,
            isAuthenticated: !!(userId || user),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Authentication test failed:', error);
        return NextResponse.json({
            error: 'Auth test failed: ' + error.message
        }, { status: 500 });
    }
}