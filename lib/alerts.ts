/**
 * Operational alerts for infrastructure failures that aren't visible to end users.
 *
 * Current channel: email to support@llmcheck.app via Resend.
 * Called from webhook handlers when downstream state-sync (Clerk, DB) fails —
 * Stripe will retry the webhook natively, but we want a human-visible trail of
 * failures so genuinely broken cases are investigated instead of silently
 * cycling through retries.
 */

import { Resend } from 'resend';

const ALERT_TO = 'support@llmcheck.app';
const ALERT_FROM = 'LLM Check Alerts <alerts@llmcheck.app>';

type AlertContext = Record<string, unknown>;

/**
 * Send an operational alert. Non-blocking — failures to send the alert are
 * logged but not thrown, since the caller is typically already handling its
 * own error.
 */
export async function sendAlert(
  subject: string,
  context: AlertContext,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[alert] RESEND_API_KEY not set, skipping alert:', subject);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const body = [
      `Alert: ${subject}`,
      `Time: ${new Date().toISOString()}`,
      `Environment: ${process.env.VERCEL_ENV ?? 'unknown'}`,
      '',
      'Context:',
      JSON.stringify(context, null, 2),
    ].join('\n');

    await resend.emails.send({
      from: ALERT_FROM,
      to: ALERT_TO,
      subject: `[LLM Check] ${subject}`,
      text: body,
    });
  } catch (err) {
    console.error('[alert] Failed to send alert:', subject, err);
  }
}

/**
 * Specialised alert for webhook-side failures. Stripe retries automatically
 * when we return non-2xx; this alert exists so we notice when a specific
 * user's state update keeps failing across retries.
 */
export async function alertWebhookFailure(params: {
  event: string;
  userId?: string;
  error: string;
  extra?: AlertContext;
}): Promise<void> {
  const { event, userId, error, extra } = params;
  await sendAlert(`Webhook failure: ${event}`, {
    event,
    userId: userId ?? null,
    error,
    ...extra,
  });
}
