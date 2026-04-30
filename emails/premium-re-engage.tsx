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

interface PremiumReEngageEmailProps {
  firstName?: string;
}

export default function PremiumReEngageEmail({
  firstName = 'there',
}: PremiumReEngageEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>AI search results change constantly — your visibility may have shifted since your last check</Preview>
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
              AI search results aren&apos;t static. ChatGPT, Gemini, and Perplexity are
              continuously updated — which means the brands they cite today are often
              different from last week.
            </Text>
            <Text style={paragraph}>
              Your last scan may already be outdated. A lot can shift in a few days:
              a competitor publishes new content, a model update changes citation patterns,
              or your own recent changes start to take effect.
            </Text>
            <Text style={paragraph}>
              Running a fresh scan takes about 60 seconds and will tell you exactly
              where you stand right now.
            </Text>

            <Section style={buttonSection}>
              <Button
                href="https://llmcheck.app?utm_source=email&utm_medium=reengage&utm_campaign=premium_inactive"
                style={button}
              >
                Run a fresh scan →
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}>
              Your Premium subscription is active — all features are ready to go.
            </Text>
            <Text style={paragraph}>See you in there.</Text>
            <Text style={signatureName}>Sanjeev</Text>
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

const signatureName = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 2px',
  lineHeight: '1.5',
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
