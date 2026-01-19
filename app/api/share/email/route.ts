import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { validatePremiumAccess } from '@/lib/auth-utils';
import { getAnalysisById, createPublicShare } from '@/lib/db';
import AnalysisReportEmail from '@/emails/analysis-report';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/share/email
 * Sends an analysis report via email (Premium feature)
 *
 * This endpoint sends a beautifully formatted email with the analysis report
 * to a specified recipient. It creates a share link if one doesn't exist yet.
 * This is a premium-only feature.
 *
 * @param request.body.analysisId - The ID of the analysis to email
 * @param request.body.recipientEmail - Email address of the recipient
 * @param request.body.recipientName - Optional name of the recipient
 * @returns Success message and share URL
 *
 * @example
 * Request:
 * POST /api/share/email
 * {
 *   "analysisId": "abc-123",
 *   "recipientEmail": "client@example.com",
 *   "recipientName": "John Smith"
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Analysis report sent successfully",
 *   "shareUrl": "https://llmcheck.app/share/xyz789abc"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Validate premium access (premium-only feature)
    const premiumCheck = await validatePremiumAccess();

    if (!premiumCheck.allowed) {
      return NextResponse.json(
        { error: premiumCheck.reason || 'Premium subscription required' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { analysisId, recipientEmail, recipientName } = body;

    // 4. Validate required fields
    if (!analysisId || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: analysisId and recipientEmail' },
        { status: 400 }
      );
    }

    // 5. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // 6. Fetch analysis from database
    const analysis = await getAnalysisById(analysisId);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // 7. Verify ownership
    if (analysis.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You don\'t own this analysis' },
        { status: 403 }
      );
    }

    // 8. Create or get share link
    let shareSlug: string;
    let shareUrl: string;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://llmcheck.app';

    if (analysis.is_public && analysis.share_slug) {
      // Use existing share link
      shareSlug = analysis.share_slug;
      shareUrl = `${baseUrl}/share/${shareSlug}`;
      console.log(`📎 Using existing share link: ${shareUrl}`);
    } else {
      // Create new share link
      const shareData = await createPublicShare(analysisId, userId, 30);
      shareSlug = shareData.share_slug;
      shareUrl = `${baseUrl}/share/${shareSlug}`;
      console.log(`📎 Created new share link: ${shareUrl}`);
    }

    // 9. Prepare email data
    // Extract top 5 metrics from parameters
    const topMetrics = analysis.parameters
      .slice(0, 5)
      .map(param => ({
        name: param.name,
        score: param.score,
      }));

    // 10. Render email template
    const emailHtml = await render(
      AnalysisReportEmail({
        url: analysis.url,
        overallScore: analysis.overall_score,
        topMetrics,
        shareUrl,
        recipientName: recipientName || 'there',
      })
    );

    // 11. Send email via Resend
    const emailResult = await resend.emails.send({
      from: 'LLM Ready Analyzer <analysis@llmcheck.app>',
      to: recipientEmail,
      subject: `Your LLM Analysis: ${analysis.overall_score}/100 for ${analysis.url}`,
      html: emailHtml,
    });

    if (emailResult.error) {
      console.error('❌ Email sending failed:', emailResult.error);
      throw new Error('Failed to send email');
    }

    console.log(`✅ Analysis report emailed to ${recipientEmail} (message ID: ${emailResult.data?.id})`);

    // 12. Return success response
    return NextResponse.json({
      success: true,
      message: 'Analysis report sent successfully',
      shareUrl,
    });
  } catch (error) {
    console.error('❌ Error sending analysis email:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }

      if (error.message.includes('Premium')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }

      if (error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Failed to send email. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
