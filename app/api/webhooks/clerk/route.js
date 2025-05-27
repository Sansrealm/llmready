// app/api/webhooks/clerk/route.js
// Simplified webhook handler for debugging

import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        console.log('📨 Clerk webhook received');

        // Get the request body
        const payload = await request.json();

        console.log('📋 Webhook event type:', payload.type);
        console.log('📋 Webhook data:', JSON.stringify(payload, null, 2));

        // Handle user events
        if (payload.type === 'user.updated' || payload.type === 'user.created') {
            const userData = payload.data;
            console.log('👤 User event for:', userData.id);
            console.log('📧 User email:', userData.email_addresses?.[0]?.email_address);
            console.log('📝 Public metadata:', userData.public_metadata);

            // Look for subscription data in the user object
            const userKeys = Object.keys(userData);
            const subscriptionKeys = userKeys.filter(key =>
                key.toLowerCase().includes('subscription') ||
                key.toLowerCase().includes('billing') ||
                key.toLowerCase().includes('plan')
            );

            console.log('🔍 Found subscription-related keys:', subscriptionKeys);

            subscriptionKeys.forEach(key => {
                console.log(`📋 ${key}:`, userData[key]);
            });
        }

        // Handle session events
        if (payload.type === 'session.created') {
            console.log('🔐 Session created for user:', payload.data.user_id);
        }

        return NextResponse.json({
            success: true,
            message: 'Webhook received successfully'
        });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

// Handle GET requests for webhook verification
export async function GET() {
    return NextResponse.json({
        message: 'Clerk webhook endpoint is active',
        timestamp: new Date().toISOString()
    });
}