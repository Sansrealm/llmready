// app/api/webhook/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handle checkout session completed
async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;

  console.log(`Checkout completed for user: ${userId}`);

  // Here you would typically:
  // 1. Store subscription info in your database
  // 2. Update user's plan in Clerk metadata
  // 3. Send confirmation email

  // For now, just log it
  console.log('Subscription activated for user:', userId);
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);

  // Here you would:
  // 1. Update subscription status in your database
  // 2. Update user metadata in Clerk
}

// Handle subscription deleted
async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);

  // Here you would:
  // 1. Update subscription status to canceled in your database
  // 2. Update user metadata in Clerk
}