import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';

interface CancellationDay0EmailProps {
  firstName?: string;
}

export default function CancellationDay0Email({
  firstName = 'there',
}: CancellationDay0EmailProps) {
  return (
    <Html>
      <Head />
      <Preview>We noticed you cancelled — we&apos;d love to understand what didn&apos;t work</Preview>
      <Body style={main}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>LLM Check</Heading>
            <Text style={tagline}>AI Search Visibility Platform</Text>
          </Section>

          {/* Body */}
          <Section style={contentSection}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              I saw that you cancelled your LLM Check subscription. That&apos;s completely fine —
              and I wanted to reach out personally.
            </Text>
            <Text style={paragraph}>
              Your access stays active until the end of your billing period, so
              there&apos;s no rush.
            </Text>
            <Text style={paragraph}>
              If you have 60 seconds, I&apos;d genuinely love to understand what didn&apos;t work.
              Was it the pricing? Missing features? Something confusing? Anything you share
              goes directly to me and helps us build a better product.
            </Text>

            <Section style={buttonSection}>
              <Button
                href="https://llmcheck.app/feedback/cancel?utm_source=email&utm_medium=cancellation&utm_campaign=day0_feedback"
                style={button}
              >
                Share why you cancelled →
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}>
              No hard feelings either way. Thanks for giving LLM Check a try.
            </Text>
            <Text style={paragraph}>Sanjeev</Text>
            <Text style={signatureLine}>Founder, LLM Check</Text>
            <Text style={signatureLine}>
              <Link href="https://llmcheck.app" style={link}>llmcheck.app</Link>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>© 2026 LLM Check. All rights reserved.</Text>
            <div style={footerLinks}>
              <Link href="https://llmcheck.app/privacy" style={footerLink}>Privacy Policy</Link>
              {' • '}
              <Link href="https://llmcheck.app/contact" style={footerLink}>Contact</Link>
            </div>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '40px 40px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#0f172a',
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 8px',
  lineHeight: '1.2',
};

const tagline = {
  color: '#94a3b8',
  fontSize: '14px',
  margin: '0',
  fontWeight: '400',
};

const contentSection = {
  padding: '32px 40px 24px',
};

const paragraph = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  lineHeight: '1.5',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

const divider = {
  margin: '24px 0',
  borderTop: '1px solid #e2e8f0',
};

const signatureLine = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 2px',
  lineHeight: '1.5',
};

const footer = {
  padding: '0 40px 32px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 8px',
};

const footerLinks = {
  marginTop: '8px',
};

const footerLink = {
  color: '#64748b',
  fontSize: '13px',
  textDecoration: 'none',
};
