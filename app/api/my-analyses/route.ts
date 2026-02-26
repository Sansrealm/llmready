import { NextResponse } from 'next/server';
import { checkPremiumStatus } from '@/lib/auth-utils';
import { getAnalyzedUrls } from '@/lib/db';

export async function GET() {
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

  const analyses = await getAnalyzedUrls(userId, 20);
  return NextResponse.json({ analyses });
}
