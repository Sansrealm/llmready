/**
 * POST /api/admin/migrate-visibility-schema
 *
 * One-time migration: adds prominence, sentiment, cited, score columns
 * to ai_visibility_results. Safe to run multiple times (IF NOT EXISTS).
 *
 * Protected by ADMIN_SECRET header. Run once then delete this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await sql`
    ALTER TABLE ai_visibility_results
      ADD COLUMN IF NOT EXISTS prominence VARCHAR(10)   DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS sentiment  NUMERIC(4,3)  DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS cited      BOOLEAN       DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS score      INTEGER       DEFAULT NULL
  `;

  return NextResponse.json({ ok: true, message: 'Migration complete' });
}
