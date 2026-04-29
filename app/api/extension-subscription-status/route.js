import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { verifyToken } from '@clerk/backend';
import { limitExtensionAuth, getClientIp } from '@/lib/rate-limit';

export async function GET(request) {
    try {
        const rl = await limitExtensionAuth(getClientIp(request.headers));
        if (!rl.allowed) {
            return NextResponse.json(
                { isPremium: false, error: 'Rate limit exceeded' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds ?? 60) } }
            );
        }

        const authHeader = request.headers.get('authorization');

        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { isPremium: false, error: 'Bearer token required' },
                { status: 401 }
            );
        }
        const token = authHeader.substring(7);

        let userId;
        try {
            const verifiedToken = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
                authorizedParties: ['chrome-extension://ajcjkkbebpgofanpddihbkilmcnjddad', 'https://www.llmcheck.app'],
            });
            userId = verifiedToken.sub;
        } catch (tokenError) {
            return NextResponse.json(
                { isPremium: false, error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { isPremium: false, error: 'Invalid token payload' },
                { status: 401 }
            );
        }

        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        const isPremium = user.publicMetadata?.premiumUser === true;

        return NextResponse.json({ isPremium });

    } catch (error) {
        console.error('[extension-subscription-status] error:', error.message);
        return NextResponse.json(
            { isPremium: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
