// app/api/subscription/route.js
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request) {
  try {
    // Get authentication status from Clerk
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return a basic response since we're focusing on the main functionality
    // You can implement actual subscription logic later with Stripe + your database
    return NextResponse.json({
      subscription: {
        userId,
        status: 'free', // or 'premium'
        isActive: false,
        plan: 'free'
      }
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}