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

interface AnalysisReportEmailProps {
  url: string;
  overallScore: number;
  topMetrics: Array<{ name: string; score: number }>;
  shareUrl: string;
  recipientName?: string;
}

export default function AnalysisReportEmail({
  url,
  overallScore,
  topMetrics,
  shareUrl,
  recipientName = 'there',
}: AnalysisReportEmailProps) {
  const scoreColor = getScoreColor(overallScore);
  const scoreLabel = getScoreLabel(overallScore);

  return (
    <Html>
      <Head />
      <Preview>Your LLM Readiness Score: {overallScore.toString()}/100 for {url}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>LLM Ready Analyzer</Heading>
            <Text style={tagline}>AI-Powered Website Analysis</Text>
          </Section>

          {/* Greeting */}
          <Section style={contentSection}>
            <Heading style={h2}>Your Analysis is Complete!</Heading>
            <Text style={paragraph}>Hi {recipientName},</Text>
            <Text style={paragraph}>
              Great news! We've completed the LLM readiness analysis for your website.
            </Text>
            <Text style={urlDisplay}>
              <strong>Analyzed URL:</strong> {url}
            </Text>
          </Section>

          {/* Score Display */}
          <Section style={scoreSection}>
            <div style={scoreBadge}>
              <Heading style={{ ...scoreNumber, color: scoreColor }}>
                {overallScore}
              </Heading>
              <Text style={scoreOutOf}>/100</Text>
            </div>
            <Text style={scoreLabelStyle}>{scoreLabel}</Text>
            <Text style={scoreDescription}>Overall LLM Readiness Score</Text>
          </Section>

          {/* Top Metrics */}
          <Section style={metricsSection}>
            <Heading style={h3}>Key Performance Metrics</Heading>
            <Text style={metricsIntro}>
              Here's a summary of your top-performing areas:
            </Text>
            {topMetrics.map((metric, index) => {
              const metricColor = getScoreColor(metric.score);
              return (
                <div key={index} style={metricRow}>
                  <div style={metricInfo}>
                    <Text style={metricName}>{metric.name}</Text>
                    <Text style={metricDescription}>
                      {getMetricDescription(metric.name)}
                    </Text>
                  </div>
                  <div style={metricScoreContainer}>
                    <Text style={{ ...metricScore, color: metricColor }}>
                      {metric.score}
                    </Text>
                    <Text style={metricScoreLabel}>/100</Text>
                  </div>
                </div>
              );
            })}
          </Section>

          <Hr style={divider} />

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Text style={ctaText}>
              Ready to see the complete analysis with detailed insights and recommendations?
            </Text>
            <Button href={shareUrl} style={button}>
              View Full Report
            </Button>
            <Text style={secondaryLink}>
              or{' '}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://llmready.com'}/dashboard`} style={link}>
                view in your dashboard
              </Link>
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © 2026 LLM Ready Analyzer. All rights reserved.
            </Text>
            <Text style={footerText}>
              This analysis helps you understand how well your website is optimized for AI and LLM consumption.
            </Text>
            <div style={footerLinks}>
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://llmready.com'}/about`} style={footerLink}>
                About Us
              </Link>
              {' • '}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://llmready.com'}/privacy`} style={footerLink}>
                Privacy Policy
              </Link>
              {' • '}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://llmready.com'}/contact`} style={footerLink}>
                Contact
              </Link>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Helper functions
function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'; // green
  if (score >= 50) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent Performance';
  if (score >= 50) return 'Good Progress';
  return 'Needs Improvement';
}

function getMetricDescription(metricName: string): string {
  const descriptions: Record<string, string> = {
    'Content Quality': 'Measures text clarity and structure',
    'Semantic HTML': 'Evaluates proper HTML tag usage',
    'Metadata': 'Checks completeness of meta information',
    'Performance': 'Assesses loading speed and optimization',
    'Accessibility': 'Reviews WCAG compliance and usability',
    'Mobile Responsiveness': 'Tests mobile-friendly design',
    'Schema Markup': 'Validates structured data implementation',
    'Security': 'Verifies HTTPS and security headers',
  };
  return descriptions[metricName] || 'Performance indicator';
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
  margin: '0 0 12px',
};

const urlDisplay = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '16px 0 0',
  padding: '12px 16px',
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  borderLeft: '3px solid #3b82f6',
};

const scoreSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
};

const scoreBadge = {
  display: 'inline-flex',
  alignItems: 'baseline',
  justifyContent: 'center',
  marginBottom: '12px',
};

const scoreNumber = {
  fontSize: '72px',
  fontWeight: '700',
  lineHeight: '1',
  margin: '0',
  letterSpacing: '-0.02em',
};

const scoreOutOf = {
  fontSize: '32px',
  fontWeight: '500',
  color: '#94a3b8',
  margin: '0 0 0 4px',
};

const scoreLabelStyle = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 4px',
};

const scoreDescription = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0',
};

const metricsSection = {
  padding: '32px 40px',
};

const h3 = {
  color: '#1e293b',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const metricsIntro = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 20px',
};

const metricRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  marginBottom: '12px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
};

const metricInfo = {
  flex: '1',
};

const metricName = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 4px',
  lineHeight: '1.4',
};

const metricDescription = {
  color: '#64748b',
  fontSize: '13px',
  margin: '0',
  lineHeight: '1.4',
};

const metricScoreContainer = {
  display: 'flex',
  alignItems: 'baseline',
  marginLeft: '16px',
};

const metricScore = {
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '1',
};

const metricScoreLabel = {
  fontSize: '16px',
  fontWeight: '500',
  color: '#94a3b8',
  margin: '0 0 0 2px',
};

const divider = {
  margin: '32px 40px',
  borderTop: '1px solid #e2e8f0',
};

const buttonSection = {
  padding: '0 40px 32px',
  textAlign: 'center' as const,
};

const ctaText = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 20px',
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
  margin: '0 0 16px',
  lineHeight: '1.5',
};

const secondaryLink = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
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
  marginTop: '16px',
};

const footerLink = {
  color: '#64748b',
  fontSize: '13px',
  textDecoration: 'none',
};
