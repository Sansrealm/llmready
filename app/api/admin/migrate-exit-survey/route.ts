/**
 * POST /api/admin/migrate-exit-survey
 * One-time migration: creates exit_survey_responses table.
 * Safe to run multiple times (IF NOT EXISTS).
 * Protected by x-admin-secret header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await sql`
    CREATE TABLE IF NOT EXISTS exit_survey_responses (
      id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      VARCHAR(255) DEFAULT NULL,      -- Clerk user ID (null for guests)
      session_id   VARCHAR(255) DEFAULT NULL,      -- localStorage UUID for cross-session tracking
      reason       VARCHAR(50)  NOT NULL,           -- price | value | features | team | other
      other_text   TEXT         DEFAULT NULL,       -- free-text when reason = 'other'
      page         VARCHAR(100) DEFAULT NULL,       -- page where survey was shown
      responded_at TIMESTAMPTZ  DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_exit_survey_user_id
      ON exit_survey_responses(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_exit_survey_responded_at
      ON exit_survey_responses(responded_at DESC)
  `;

  return NextResponse.json({ ok: true, message: 'exit_survey_responses table ready' });
}
