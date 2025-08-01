// In app/api/webhooks/clerk/route.js

import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
    // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
    }

    // Get the headers for signature verification
    const headerPayload = headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', { status: 400 });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt;

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        });
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occured', { status: 400 });
    }

    // Get the event type
    const eventType = evt.type;
    console.log(`🔔 Webhook received with type: ${eventType}`);

    // --- HANDLE THE SUBSCRIPTION EVENTS ---
    // Listen for when a subscription is first created or updated
    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
        const { user_id, plan_id, status } = evt.data;

        // Check if the subscription is active and matches your premium plan slug
        if (status === 'active' && plan_id === 'llm_check_premium') {
            try {
                await clerkClient.users.updateUserMetadata(user_id, {
                    privateMetadata: {
                        'plan': 'llm_check_premium'
                    }
                });
                console.log(`✅ User ${user_id} metadata updated to premium.`);
            } catch (err) {
                console.error('Error updating user metadata:', err);
                return new Response('Error updating metadata', { status: 500 });
            }
        }
    }

    return new Response('', { status: 200 });
}