// API route for handling Stripe webhooks
// src/app/api/webhook/route.js

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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
  
  // Retrieve the subscription
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  // Store subscription info in Firestore
  const userSubscriptionRef = doc(db, 'subscriptions', userId);
  await setDoc(userSubscriptionRef, {
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    stripePriceId: subscription.items.data[0].price.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription) {
  // Find the user by customer ID
  const customerId = subscription.customer;
  
  // In a real app, you would query Firestore to find the user with this customer ID
  // For simplicity, we'll assume we have a way to find the userId from the customerId
  // This could be done by maintaining a separate collection mapping customer IDs to user IDs
  
  // For demonstration purposes:
  const userSubscriptionRef = doc(db, 'subscriptions', 'userId'); // Replace with actual userId lookup
  
  await setDoc(userSubscriptionRef, {
    status: subscription.status,
    stripePriceId: subscription.items.data[0].price.id,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    updatedAt: new Date(),
  }, { merge: true });
}

// Handle subscription deleted
async function handleSubscriptionDeleted(subscription) {
  // Find the user by customer ID
  const customerId = subscription.customer;
  
  // Similar to above, in a real app you would find the userId from the customerId
  
  // For demonstration purposes:
  const userSubscriptionRef = doc(db, 'subscriptions', 'userId'); // Replace with actual userId lookup
  
  await setDoc(userSubscriptionRef, {
    status: 'canceled',
    updatedAt: new Date(),
    canceledAt: new Date(),
  }, { merge: true });
}
