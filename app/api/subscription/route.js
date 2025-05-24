// API route for creating Stripe portal sessions
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, currentUser } from '@clerk/nextjs/server';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  console.log('Portal session request received');

  try {
    // Get authentication status from Clerk
    const { userId } = auth();
    console.log('Auth check result:', userId ? 'User authenticated' : 'User not authenticated');

    // Check if user is authenticated
    if (!userId) {
      console.log('Authentication failed: No userId found');
      return NextResponse.json(
        { error: 'You must be logged in to manage your subscription' },
        { status: 401 }
      );
    }

    console.log('Fetching user data for userId:', userId);

    // Get user data from Clerk
    const user = await currentUser();
    if (!user) {
      console.log('User not found in Clerk');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const email = user.emailAddresses[0]?.emailAddress;
    console.log('User email found:', email ? 'Yes' : 'No');

    // Find customer in Stripe
    console.log('Looking up Stripe customer for user');
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('Existing customer found:', customerId);
    } else {
      // Create a new customer if none exists
      console.log('No customer found, creating new customer');
      const newCustomer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId,
        },
      });
      customerId = newCustomer.id;
      console.log('New customer created:', customerId);
    }

    // Create a portal session
    console.log('Creating customer portal session');
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    console.log('Portal session created successfully');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session: ' + error.message },
      { status: 500 }
    );
  }
}
