// app/api/debug-clerk/route.js
// Temporary debug route - DELETE after testing

import { NextResponse } from 'next/server';

export async function GET() {
    console.log('🔍 Environment Debug');

    // Check environment variables (safely)
    const secretKey = process.env.CLERK_SECRET_KEY;
    const publicKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    return NextResponse.json({
        hasSecretKey: !!secretKey,
        secretKeyPrefix: secretKey ? secretKey.substring(0, 8) + '...' : 'MISSING',
        hasPublicKey: !!publicKey,
        publicKeyPrefix: publicKey ? publicKey.substring(0, 8) + '...' : 'MISSING',
        nodeEnv: process.env.NODE_ENV
    });
}