// TODO: Delete this file after running migration in production once.
// This endpoint should not remain in a deployed codebase permanently.

/**
 * POST /api/admin/migrate-citation-schema
 *
 * One-time migration: adds citation_results, citation_rate, citation_gaps,
 * query_buckets, and citation_data_quality columns to the analyses table.
 * Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
 *
 * Protected by x-admin-secret header. Run once then delete this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await sql`
    ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS citation_results      JSONB,
      ADD COLUMN IF NOT EXISTS citation_rate         FLOAT,
      ADD COLUMN IF NOT EXISTS citation_gaps         JSONB,
      ADD COLUMN IF NOT EXISTS query_buckets         JSONB,
      ADD COLUMN IF NOT EXISTS citation_data_quality VARCHAR(20)
  `;

  return NextResponse.json({ ok: true, message: 'Citation schema migration complete' });
}
