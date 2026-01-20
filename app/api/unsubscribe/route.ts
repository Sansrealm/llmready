import { NextRequest, NextResponse } from 'next/server';
import { optOutGuestEmail } from '@/lib/db';

/**
 * GET /api/unsubscribe?email=user@example.com
 * Allows guest users to opt out of email communications
 *
 * This endpoint handles unsubscribe requests from email campaigns.
 * Can be accessed via GET with email parameter (for email links)
 * or POST with JSON body (for form submissions).
 *
 * GDPR Compliance: Honors opt-out requests immediately
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    // Validate email parameter presence
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Opt out the email
    const success = await optOutGuestEmail(email);

    if (!success) {
      return NextResponse.json(
        { error: 'Email not found in our system' },
        { status: 404 }
      );
    }

    console.log(`✅ Guest email unsubscribed: ${email}`);

    // Return success page HTML
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Unsubscribed - LLM Check</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              max-width: 500px;
              width: 100%;
              padding: 48px 32px;
              text-align: center;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 24px;
            }
            h1 {
              color: #10b981;
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 16px;
            }
            p {
              color: #6b7280;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 12px;
            }
            a {
              display: inline-block;
              margin-top: 24px;
              padding: 12px 32px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            a:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
            }
            .email {
              background: #f3f4f6;
              padding: 8px 16px;
              border-radius: 6px;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              color: #374151;
              margin: 16px 0;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Successfully Unsubscribed</h1>
            <p>You've been removed from our email list.</p>
            <div class="email">${email}</div>
            <p>You will no longer receive product updates or offers from LLM Check.</p>
            <p style="font-size: 14px; color: #9ca3af; margin-top: 24px;">
              If you change your mind, you can always opt back in by using our service again.
            </p>
            <a href="https://llmcheck.app">Return to Homepage</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('❌ Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/unsubscribe
 * Alternative unsubscribe method via form submission
 *
 * Accepts JSON body: { email: string }
 * Returns JSON response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email presence
    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Opt out the email
    const success = await optOutGuestEmail(email);

    console.log(`✅ Guest email unsubscribed via POST: ${email}`);

    return NextResponse.json({
      success,
      message: success
        ? 'Successfully unsubscribed'
        : 'Email not found in our system',
    }, {
      status: success ? 200 : 404
    });
  } catch (error) {
    console.error('❌ Unsubscribe POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
