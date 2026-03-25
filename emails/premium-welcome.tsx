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

interface PremiumWelcomeEmailProps {
  firstName?: string;
  senderName?: string;
  senderTitle?: string;
  senderUrl?: string;
}

export default function PremiumWelcomeEmail({
  firstName = 'there',
  senderName = 'Sanjeev',
  senderTitle = 'Founder, LLM Check',
  senderUrl = 'https://llmcheck.app',
}: PremiumWelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to LLM Check Premium — here&apos;s how to get started</Preview>
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
              Welcome to LLM Check Premium — and thank you for joining.
            </Text>
            <Text style={paragraph}>
              <strong>Here&apos;s the one thing to do right now:</strong>
            </Text>
            <Text style={paragraph}>
              Run a full analysis on your site at{' '}
              <Link href="https://llmcheck.app" style={link}>llmcheck.app</Link>.
              You&apos;ll get your LLM Readiness Score, a live citation check across ChatGPT,
              Gemini, and Perplexity, competitor displacement data, and a prioritised list of
              exactly what to fix first.
            </Text>
            <Text style={paragraph}>The whole thing takes about 60 seconds.</Text>

            <Section style={buttonSection}>
              <Button href="https://llmcheck.app" style={button}>
                Run your analysis →
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}><strong>A few things worth knowing:</strong></Text>
            <Text style={bulletItem}>
              — Your report is shareable. Send it to a colleague, a client, or anyone you want
              to show where you stand in AI search.
            </Text>
            <Text style={bulletItem}>
              — You can re-analyse every 72 hours to track progress as you make changes.
            </Text>
            <Text style={bulletItem}>
              — We&apos;re adding Provenance Scoring soon — it will tell you whether AI systems
              recognise your brand as a credible entity, which is the root cause of most low
              citation rates.
            </Text>

            <Hr style={divider} />

            <Text style={paragraph}>
              If you have any feature request — just reply to this email. I read every response.
            </Text>
            <Text style={paragraph}>Glad to have you on board.</Text>
            <Text style={signatureName}>{senderName}</Text>
            <Text style={signatureLine}>{senderTitle}</Text>
            <Text style={signatureLine}>
              <Link href={senderUrl} style={link}>{senderUrl}</Link>
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

const bulletItem = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 12px',
  paddingLeft: '8px',
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
