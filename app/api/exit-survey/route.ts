/**
 * POST /api/exit-survey
 * Saves an exit survey response. Public endpoint — no auth required
 * (guests can submit too). Rate limiting is handled client-side via
 * localStorage flags.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

const VALID_REASONS = ['price', 'value', 'features', 'team', 'other'] as const;
type Reason = (typeof VALID_REASONS)[number];

export async function POST(req: NextRequest) {
  try {
    const { reason, otherText, sessionId, page } = await req.json() as {
      reason: Reason;
      otherText?: string;
      sessionId?: string;
      page?: string;
    };

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    // Get user ID if signed in — null for guests
    const { userId } = await auth();

    await sql`
      INSERT INTO exit_survey_responses (user_id, session_id, reason, other_text, page)
      VALUES (
        ${userId ?? null},
        ${sessionId ?? null},
        ${reason},
        ${reason === 'other' ? (otherText?.trim() || null) : null},
        ${page ?? null}
      )
    `;

    console.log(`📋 Exit survey: ${reason}${otherText ? ` — "${otherText}"` : ''} (userId: ${userId ?? 'guest'})`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[exit-survey] error:', error);
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}
