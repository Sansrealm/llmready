import { NextRequest, NextResponse } from 'next/server';
import { saveVisibilityWaitlistSignup } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, url, industry, userId } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const result = await saveVisibilityWaitlistSignup({
      email,
      url: url || null,
      industry: industry || null,
      userId: userId || null,
    });

    return NextResponse.json({
      success: true,
      isNew: result.is_new,
      message: result.is_new
        ? 'You\'ve been added to the waitlist!'
        : 'You\'re already on the waitlist. We\'ve updated your info.',
    });
  } catch (error) {
    console.error('Visibility waitlist signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save signup' },
      { status: 500 }
    );
  }
}
