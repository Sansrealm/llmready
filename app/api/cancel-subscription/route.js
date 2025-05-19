// API route for canceling subscription
// src/app/api/cancel-subscription/route.js

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Fetch subscription from Firestore
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const subscriptionDoc = await getDoc(subscriptionRef);

    if (!subscriptionDoc.exists()) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const subscription = subscriptionDoc.data();
    
    // Cancel the subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update the subscription in Firestore
    await updateDoc(subscriptionRef, {
      status: 'active', // Still active until the end of the period
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    });

    // Fetch the updated subscription
    const updatedSubscriptionDoc = await getDoc(subscriptionRef);
    const updatedSubscription = updatedSubscriptionDoc.data();

    return NextResponse.json({
      subscription: {
        ...updatedSubscription,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd.toDate().toISOString(),
        currentPeriodStart: updatedSubscription.currentPeriodStart.toDate().toISOString(),
        createdAt: updatedSubscription.createdAt.toDate().toISOString(),
        updatedAt: updatedSubscription.updatedAt.toDate().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
