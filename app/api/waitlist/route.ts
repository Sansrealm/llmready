import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { saveFeatureWaitlistSignup } from '@/lib/db';

const ALLOWED_FEATURES = new Set([
  'agency_dashboard',
  'competitor_tracking',
  'ai_visibility',
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feature, email, url, metadata } = body;

    if (!feature || !ALLOWED_FEATURES.has(feature)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing feature' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const { userId } = await auth();

    const result = await saveFeatureWaitlistSignup({
      feature,
      email,
      userId: userId ?? null,
      url: url || null,
      metadata: metadata || undefined,
    });

    return NextResponse.json({
      success: true,
      isNew: result.is_new,
      message: result.is_new
        ? "You've been added to the waitlist!"
        : "You're already on the waitlist. We've updated your info.",
    });
  } catch (error) {
    console.error('[waitlist] signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save signup' },
      { status: 500 }
    );
  }
}
