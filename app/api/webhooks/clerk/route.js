// app/api/webhooks/clerk/route.js
// Webhook handler to sync subscription status from Clerk

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

export async function POST(request) {
    try {
        // Get the webhook payload
        const payload = await request.text();
        const headerPayload = headers();
        const svixId = headerPayload.get('svix-id');
        const svixTimestamp = headerPayload.get('svix-timestamp');
        const svixSignature = headerPayload.get('svix-signature');

        // Verify the webhook (you'll need to set CLERK_WEBHOOK_SECRET in your env)
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('❌ CLERK_WEBHOOK_SECRET not set');
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        const webhook = new Webhook(webhookSecret);
        let event;

        try {
            event = webhook.verify(payload, {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature,
            });
        } catch (error) {
            console.error('❌ Webhook verification failed:', error);
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
        }

        console.log('📨 Received Clerk webhook:', event.type);

        // Handle subscription-related events
        if (event.type === 'user.updated') {
            const { id: userId, public_metadata, subscriptions } = event.data;

            console.log('👤 User updated:', userId);
            console.log('📋 Subscriptions:', subscriptions);
            console.log('📝 Public metadata:', public_metadata);

            // Here you could:
            // 1. Update your database with subscription status
            // 2. Set premium flags in user metadata
            // 3. Trigger any premium-related actions

            // For now, just log the subscription data
            if (subscriptions && subscriptions.length > 0) {
                const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
                console.log('✅ Active subscriptions found:', activeSubscriptions);
            }
        }

        // Handle other subscription events if needed
        if (event.type === 'subscription.created' ||
            event.type === 'subscription.updated' ||
            event.type === 'subscription.deleted') {

            console.log('💳 Subscription event:', event.type);
            console.log('📋 Subscription data:', event.data);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('❌ Webhook handler error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}