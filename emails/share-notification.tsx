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

interface ShareNotificationEmailProps {
  url: string;
  shareUrl: string;
  senderName?: string;
  message?: string;
}

export default function ShareNotificationEmail({
  url,
  shareUrl,
  senderName = 'Someone',
  message,
}: ShareNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{senderName} has shared an LLM analysis report with you</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>LLM Ready Analyzer</Heading>
          </Section>

          {/* Main Content */}
          <Section style={contentSection}>
            <Heading style={h2}>You've Received a Shared Report</Heading>
            <Text style={paragraph}>
              <strong>{senderName}</strong> has shared an LLM readiness analysis report with you.
            </Text>

            {message && (
              <div style={messageBox}>
                <Text style={messageLabel}>Personal Message:</Text>
                <Text style={messageText}>"{message}"</Text>
              </div>
            )}

            <div style={urlPreview}>
              <Text style={urlLabel}>Analyzed Website:</Text>
              <Text style={urlText}>{url}</Text>
            </div>

            <Text style={description}>
              This report contains a comprehensive analysis of how well this website is optimized
              for AI and Large Language Model (LLM) consumption, including performance metrics,
              content quality assessment, and actionable recommendations.
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button href={shareUrl} style={button}>
              View Report
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Info Section */}
          <Section style={infoSection}>
            <Heading style={h3}>What is LLM Ready Analyzer?</Heading>
            <Text style={infoParagraph}>
              LLM Ready Analyzer is an AI-powered tool that evaluates websites for optimal
              performance with Large Language Models like ChatGPT, Claude, and other AI systems.
              It provides detailed insights into content structure, semantic quality, and
              technical optimization.
            </Text>
            <Text style={ctaText}>
              Want to analyze your own website?{' '}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://llmready.com'}`} style={link}>
                Get started for free
              </Link>
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © 2026 LLM Ready Analyzer. All rights reserved.
            </Text>
            <div style={footerLinks}>
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://llmready.com'}/about`} style={footerLink}>
                About
              </Link>
              {' • '}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://llmready.com'}/privacy`} style={footerLink}>
                Privacy
              </Link>
              {' • '}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://llmready.com'}/contact`} style={footerLink}>
                Contact
              </Link>
            </div>
            <Text style={footerDisclaimer}>
              You received this email because {senderName} shared a report with you.
              This is a one-time notification.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Inline styles (email client compatible)
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
  padding: '40px 40px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#0f172a',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '1.2',
};

const contentSection = {
  padding: '32px 40px',
};

const h2 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
  lineHeight: '1.3',
};

const paragraph = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const messageBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderLeft: '4px solid #3b82f6',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const messageLabel = {
  color: '#64748b',
  fontSize: '13px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const messageText = {
  color: '#1e293b',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0',
  fontStyle: 'italic' as const,
};

const urlPreview = {
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
};

const urlLabel = {
  color: '#64748b',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const urlText = {
  color: '#1e293b',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0',
  wordBreak: 'break-all' as const,
};

const description = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '20px 0 0',
};

const buttonSection = {
  padding: '0 40px 32px',
  textAlign: 'center' as const,
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
  padding: '14px 40px',
  margin: '0',
  lineHeight: '1.5',
  minWidth: '200px',
};

const divider = {
  margin: '0 40px',
  borderTop: '1px solid #e2e8f0',
};

const infoSection = {
  padding: '32px 40px',
  backgroundColor: '#fefce8',
  borderTop: '2px solid #fde047',
  borderBottom: '2px solid #fde047',
};

const h3 = {
  color: '#713f12',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const infoParagraph = {
  color: '#854d0e',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const ctaText = {
  color: '#713f12',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
  fontWeight: '600',
};

const footer = {
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 12px',
};

const footerLinks = {
  marginBottom: '16px',
};

const footerLink = {
  color: '#64748b',
  fontSize: '13px',
  textDecoration: 'none',
};

const footerDisclaimer = {
  color: '#cbd5e1',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
};
