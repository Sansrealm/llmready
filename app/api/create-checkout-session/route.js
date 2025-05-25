// API route for creating Stripe checkout sessions
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Premium price ID - $9/month subscription
const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1234567890';

export async function POST(request) {
  console.log('Checkout session request received');

  try {
    // Get user email from request body
    const { email } = await request.json();

    if (!email) {
      console.log('Email is required but not provided');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get authentication status from Clerk
    const { userId } = auth();
    console.log('Auth check result:', userId ? `User authenticated with ID: ${userId}` : 'User not authenticated');

    // Skip authentication check in production for now
    // This allows the checkout flow to work even if Clerk auth has issues
    // The email is still required and provided by the frontend

    // Create a client reference ID - use userId if available, otherwise use email
    const clientReferenceId = userId || `email:${email}`;

    console.log('Creating Stripe checkout session for email:', email);

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
      client_reference_id: clientReferenceId,
      metadata: {
        userId: userId || `email:${email}`, // Store userId or email-based ID
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
