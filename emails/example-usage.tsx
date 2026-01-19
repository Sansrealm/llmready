/**
 * Example Usage of Email Templates
 *
 * This file demonstrates how to use the email templates with React Email and Resend
 */

import { render } from '@react-email/render';
import { Resend } from 'resend';
import AnalysisReportEmail from './analysis-report';
import ShareNotificationEmail from './share-notification';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Example 1: Send Analysis Report Email
 *
 * This is typically called after completing an analysis
 */
export async function sendAnalysisReportEmail(
  recipientEmail: string,
  data: {
    url: string;
    overallScore: number;
    topMetrics: Array<{ name: string; score: number }>;
    shareUrl: string;
    recipientName?: string;
  }
) {
  try {
    // Render the email template to HTML
    const emailHtml = await render(
      AnalysisReportEmail({
        url: data.url,
        overallScore: data.overallScore,
        topMetrics: data.topMetrics,
        shareUrl: data.shareUrl,
        recipientName: data.recipientName,
      })
    );

    // Send the email using Resend
    const result = await resend.emails.send({
      from: 'LLM Ready Analyzer <analysis@llmready.com>',
      to: recipientEmail,
      subject: `Your LLM Readiness Analysis: ${data.overallScore}/100 for ${data.url}`,
      html: emailHtml,
    });

    console.log('Analysis report email sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending analysis report email:', error);
    throw error;
  }
}

/**
 * Example 2: Send Share Notification Email
 *
 * This is called when a user shares a report via email
 */
export async function sendShareNotificationEmail(
  recipientEmail: string,
  data: {
    url: string;
    shareUrl: string;
    senderName?: string;
    message?: string;
  }
) {
  try {
    // Render the email template to HTML
    const emailHtml = await render(
      ShareNotificationEmail({
        url: data.url,
        shareUrl: data.shareUrl,
        senderName: data.senderName,
        message: data.message,
      })
    );

    // Send the email using Resend
    const result = await resend.emails.send({
      from: 'LLM Ready Analyzer <share@llmready.com>',
      to: recipientEmail,
      subject: `${data.senderName || 'Someone'} shared an LLM analysis report with you`,
      html: emailHtml,
    });

    console.log('Share notification email sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending share notification email:', error);
    throw error;
  }
}

/**
 * Example Usage in API Route or Server Action
 */
export async function exampleUsageInApiRoute() {
  // Example 1: Send analysis report after analysis completes
  await sendAnalysisReportEmail('user@example.com', {
    url: 'https://example.com',
    overallScore: 87,
    topMetrics: [
      { name: 'Content Quality', score: 92 },
      { name: 'Semantic HTML', score: 85 },
      { name: 'Metadata', score: 90 },
      { name: 'Performance', score: 78 },
      { name: 'Accessibility', score: 88 },
    ],
    shareUrl: 'https://llmready.com/share/abc123',
    recipientName: 'John Doe',
  });

  // Example 2: Send share notification when user shares report
  await sendShareNotificationEmail('recipient@example.com', {
    url: 'https://example.com',
    shareUrl: 'https://llmready.com/share/abc123',
    senderName: 'Jane Smith',
    message: 'Check out this LLM analysis report! I think you\'ll find it interesting.',
  });
}

/**
 * Usage in Next.js API Route (app/api/send-analysis/route.ts)
 */
/*
import { NextRequest, NextResponse } from 'next/server';
import { sendAnalysisReportEmail } from '@/emails/example-usage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, analysisData } = body;

    await sendAnalysisReportEmail(email, analysisData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in send-analysis route:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
*/

/**
 * Usage in Server Action (app/actions/email.ts)
 */
/*
'use server';

import { sendAnalysisReportEmail, sendShareNotificationEmail } from '@/emails/example-usage';

export async function sendAnalysisEmail(email: string, data: any) {
  return await sendAnalysisReportEmail(email, data);
}

export async function sendShareEmail(email: string, data: any) {
  return await sendShareNotificationEmail(email, data);
}
*/

/**
 * Preview Templates Locally
 *
 * To preview these templates locally:
 * 1. Install the React Email CLI: npm install -g react-email
 * 2. Run: npx react-email dev
 * 3. Open: http://localhost:3000
 *
 * Or use the render function to generate HTML:
 */
export async function previewAnalysisReportEmail() {
  const html = await render(
    AnalysisReportEmail({
      url: 'https://example.com',
      overallScore: 87,
      topMetrics: [
        { name: 'Content Quality', score: 92 },
        { name: 'Semantic HTML', score: 85 },
        { name: 'Metadata', score: 90 },
      ],
      shareUrl: 'https://llmready.com/share/abc123',
      recipientName: 'John Doe',
    })
  );

  console.log('Preview HTML:', html);
  return html;
}

export async function previewShareNotificationEmail() {
  const html = await render(
    ShareNotificationEmail({
      url: 'https://example.com',
      shareUrl: 'https://llmready.com/share/abc123',
      senderName: 'Jane Smith',
      message: 'Check out this report!',
    })
  );

  console.log('Preview HTML:', html);
  return html;
}
