import { NextResponse } from 'next/server';
import { checkPremiumStatus } from '@/lib/auth-utils';
import { getAnalyzedUrls } from '@/lib/db';

export async function GET(req: Request) {
  const { isPremium, userId } = await checkPremiumStatus();

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!isPremium) {
    return NextResponse.json(
      { error: 'Premium subscription required', upgrade: true },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 200);
  const analyses = await getAnalyzedUrls(userId, limit);
  return NextResponse.json({ analyses });
}
