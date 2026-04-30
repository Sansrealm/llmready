import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import PremiumReEngageEmail from '@/emails/premium-re-engage';

// Force Node.js runtime — clerkClient requires it
export const runtime = 'nodejs';

const FOUR_DAYS_MS  = 4 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // 1. Verify CRON_SECRET — return 401, not 500, on auth failure
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const client = await clerkClient();

  // 2. Paginate all Clerk users, collect premium users in the 4–7 day window
  const eligibleUsers: Array<{ email: string; firstName: string }> = [];
  const pageLimit = 100;
  let offset = 0;

  while (true) {
    const response = await client.users.getUserList({ limit: pageLimit, offset });
    const users = response.data;

    for (const user of users) {
      // Must be a premium user
      if (user.publicMetadata?.premiumUser !== true) continue;

      // last_sign_in_at is Unix ms (null if user has never signed in)
      const lastSignIn = user.lastSignInAt;
      if (!lastSignIn) continue;

      const elapsed = now - lastSignIn;
      if (elapsed < FOUR_DAYS_MS || elapsed > SEVEN_DAYS_MS) continue;

      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) continue;

      eligibleUsers.push({
        email,
        firstName: user.firstName ?? 'there',
      });
    }

    // Stop when the last page returned fewer items than the page limit
    offset += users.length;
    if (users.length < pageLimit) break;
  }

  // 3. Send re-engagement email to each eligible user
  let sent = 0;
  let errors = 0;

  for (const { email, firstName } of eligibleUsers) {
    try {
      const emailHtml = await render(PremiumReEngageEmail({ firstName }));
      await resend.emails.send({
        from: 'LLM Check <analysis@llmcheck.app>',
        to: email,
        subject: 'Your brand visibility may have shifted',
        html: emailHtml,
      });
      sent++;
    } catch (err) {
      // One failure must not stop the loop for remaining users
      console.error(`Re-engage email failed for user (not logging email):`, err);
      errors++;
    }
  }

  console.log(`✅ Re-engage cron complete: processed=${eligibleUsers.length} sent=${sent} errors=${errors}`);

  return NextResponse.json({
    processed: eligibleUsers.length,
    sent,
    errors,
  });
}
