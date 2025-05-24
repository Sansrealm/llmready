// API route for creating Stripe checkout sessions
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs';
import { getAuth } from '@clerk/nextjs/server';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Premium price ID - $9/month subscription
const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1234567890';

export async function POST(request) {
  console.log('Checkout session request received');

  try {
    // Get authentication status from Clerk using getAuth
    const { userId } = getAuth(request);
    console.log('Auth check result:', userId ? 'User authenticated' : 'User not authenticated');

    // Check if user is authenticated
    if (!userId) {
      console.log('Authentication failed: No userId found');
      return NextResponse.json(
        { error: 'You must be logged in to subscribe' },
        { status: 401 }
      );
    }

    console.log('Fetching user data for userId:', userId);

    // Get user data from Clerk
    const user = await clerkClient.users.getUser(userId);
    if (!user) {
      console.log('User not found in Clerk');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const email = user.emailAddresses[0]?.emailAddress;
    console.log('User email found:', email ? 'Yes' : 'No');

    console.log('Creating Stripe checkout session');

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    });

    console.log('Checkout session created successfully');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session: ' + error.message },
      { status: 500 }
    );
  }
}
