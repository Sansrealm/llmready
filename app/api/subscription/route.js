// API route for fetching subscription status
// src/app/api/subscription/route.js

import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request) {
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
      return NextResponse.json({ subscription: null });
    }

    const subscription = subscriptionDoc.data();

    // Check if subscription is active
    const now = new Date();
    const currentPeriodEnd = subscription.currentPeriodEnd.toDate();
    const isActive = subscription.status === 'active' && currentPeriodEnd > now;

    return NextResponse.json({
      subscription: {
        ...subscription,
        isActive,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        currentPeriodStart: subscription.currentPeriodStart.toDate().toISOString(),
        createdAt: subscription.createdAt.toDate().toISOString(),
        updatedAt: subscription.updatedAt.toDate().toISOString(),
        canceledAt: subscription.canceledAt ? subscription.canceledAt.toDate().toISOString() : null,
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
