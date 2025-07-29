// In app/api/webhooks/clerk/route.js
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) { throw new Error('Missing CLERK_WEBHOOK_SECRET'); }

    const headerPayload = headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error: Missing svix headers', { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt;

    try {
        evt = wh.verify(body, { /* ...headers */ });
    } catch (err) {
        return new Response('Error verifying webhook', { status: 400 });
    }

    const eventType = evt.type;
    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
        const { user_id, plan_id, status } = evt.data;
        if (status === 'active' && plan_id === 'llm_check_premium') {
            await clerkClient.users.updateUserMetadata(user_id, {
                privateMetadata: { 'plan': 'llm_check_premium' }
            });
        }
    }
    return new Response('', { status: 200 });
}