# Email Templates

This directory contains React Email templates for the LLM Ready Analyzer application.

## Templates

### 1. Analysis Report Email (`analysis-report.tsx`)

Sends completed analysis reports to users with their LLM readiness score and top metrics.

**Purpose**: Notify users when their website analysis is complete and provide a summary of results.

**Props**:
```typescript
interface AnalysisReportEmailProps {
  url: string;                              // The analyzed website URL
  overallScore: number;                     // Overall score (0-100)
  topMetrics: Array<{                       // Top 3-5 metrics
    name: string;                          // Metric name
    score: number;                         // Metric score (0-100)
  }>;
  shareUrl: string;                        // Link to full report
  recipientName?: string;                  // User's name (optional)
}
```

**Features**:
- Professional header with branding
- Color-coded score display (green/yellow/red)
- Top metrics summary with descriptions
- Clear call-to-action button
- Responsive design for mobile and desktop
- Email client compatible (Gmail, Outlook, Apple Mail)

**Score Color Coding**:
- 🟢 Green (80-100): Excellent Performance
- 🟡 Yellow (50-79): Good Progress
- 🔴 Red (0-49): Needs Improvement

---

### 2. Share Notification Email (`share-notification.tsx`)

Notifies recipients when someone shares an analysis report with them.

**Purpose**: Allow users to share analysis reports with colleagues via email.

**Props**:
```typescript
interface ShareNotificationEmailProps {
  url: string;                             // The analyzed website URL
  shareUrl: string;                        // Link to shared report
  senderName?: string;                     // Person sharing (optional)
  message?: string;                        // Personal message (optional)
}
```

**Features**:
- Simple, clean design
- Personal message support
- URL preview
- Clear call-to-action
- Info section about LLM Ready Analyzer
- Minimal footer

---

## Usage

### Rendering Email HTML

```typescript
import { render } from '@react-email/render';
import AnalysisReportEmail from '@/emails/analysis-report';

const emailHtml = render(
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
```

### Sending Emails with Resend

```typescript
import { Resend } from 'resend';
import { render } from '@react-email/render';
import AnalysisReportEmail from '@/emails/analysis-report';

const resend = new Resend(process.env.RESEND_API_KEY);

const emailHtml = render(AnalysisReportEmail(props));

await resend.emails.send({
  from: 'LLM Ready Analyzer <analysis@llmready.com>',
  to: 'user@example.com',
  subject: 'Your LLM Readiness Analysis is Complete',
  html: emailHtml,
});
```

### Usage in Next.js API Route

```typescript
// app/api/send-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import AnalysisReportEmail from '@/emails/analysis-report';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, analysisData } = await request.json();

    const emailHtml = render(AnalysisReportEmail(analysisData));

    await resend.emails.send({
      from: 'LLM Ready Analyzer <analysis@llmready.com>',
      to: email,
      subject: `Your LLM Readiness Analysis: ${analysisData.overallScore}/100`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
```

### Usage in Server Action

```typescript
// app/actions/email.ts
'use server';

import { render } from '@react-email/render';
import { Resend } from 'resend';
import AnalysisReportEmail from '@/emails/analysis-report';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAnalysisEmail(email: string, data: any) {
  const emailHtml = render(AnalysisReportEmail(data));

  return await resend.emails.send({
    from: 'LLM Ready Analyzer <analysis@llmready.com>',
    to: email,
    subject: `Your LLM Readiness Analysis: ${data.overallScore}/100`,
    html: emailHtml,
  });
}
```

---

## Local Development & Preview

### Preview Templates Locally

1. Install React Email CLI (if not already installed):
```bash
npm install -g react-email
```

2. Start the preview server:
```bash
npx react-email dev
```

3. Open your browser to `http://localhost:3000` to preview templates

### Test Rendering

```typescript
import { render } from '@react-email/render';
import AnalysisReportEmail from './analysis-report';

const html = render(
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

console.log(html); // Full HTML output
```

---

## Design Guidelines

### Email-Safe Styling

All templates follow email client best practices:

1. **Inline Styles**: All styles are inline CSS objects
2. **Table-Based Layouts**: Use `<Container>` and `<Section>` components
3. **Absolute URLs**: All links and images use full URLs
4. **Fallback Fonts**: System fonts with fallbacks
5. **Tested Clients**: Gmail, Outlook, Apple Mail, Yahoo Mail

### Responsive Design

- Max width: 600px (standard email width)
- Mobile-friendly padding
- Large, tappable buttons (min 44px height)
- Scalable fonts
- Fluid images

### Color Palette

- Primary: `#3b82f6` (Blue)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Yellow)
- Error: `#ef4444` (Red)
- Background: `#f6f9fc`
- Text Primary: `#1e293b`
- Text Secondary: `#64748b`

### Typography

- Headings: 600-700 weight
- Body: 400-500 weight
- Font Stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif`

---

## Environment Variables

Required for sending emails:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://llmready.com
```

---

## Testing

### Send Test Emails

```typescript
// Test in development
const result = await resend.emails.send({
  from: 'onboarding@resend.dev', // Use Resend test domain
  to: 'your-email@example.com',
  subject: 'Test Email',
  html: emailHtml,
});
```

### Validate Templates

```bash
# Type check
npx tsc --noEmit

# Build check
npm run build
```

---

## Troubleshooting

### Common Issues

1. **Styles not applying**: Ensure all styles are inline objects, not CSS classes
2. **Images not loading**: Use absolute URLs with `https://`
3. **Layout broken in Outlook**: Use `<Container>` and `<Section>` components
4. **Fonts inconsistent**: Stick to system fonts with fallbacks

### Debug Rendering

```typescript
import { render } from '@react-email/render';

// Render to plain text (for debugging)
const text = render(AnalysisReportEmail(props), { plainText: true });
console.log(text);

// Render to HTML
const html = render(AnalysisReportEmail(props));
console.log(html);
```

---

## Resources

- [React Email Documentation](https://react.email/docs)
- [Resend Documentation](https://resend.com/docs)
- [Email Client CSS Support](https://www.caniemail.com/)
- [Email Templates Best Practices](https://www.campaignmonitor.com/dev-resources/)

---

## File Structure

```
emails/
├── analysis-report.tsx       # Main analysis report template
├── share-notification.tsx    # Share notification template
├── example-usage.tsx         # Usage examples and helper functions
└── README.md                 # This file
```

---

## Next Steps

1. Configure Resend API key in `.env.local`
2. Set up verified sender domain in Resend dashboard
3. Implement email sending in API routes
4. Test emails in different email clients
5. Monitor email delivery and open rates
