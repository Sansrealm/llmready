-- Migration: Create guest_emails table for email capture
-- Created: 2026-01-20
-- Purpose: Store guest user emails for outreach campaigns with deduplication
--
-- This migration adds a new table to capture emails from unauthenticated users
-- who analyze their websites. Emails are deduplicated with analysis count tracking.

-- Create guest_emails table
CREATE TABLE IF NOT EXISTS guest_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_analysis_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analysis_count INTEGER NOT NULL DEFAULT 1,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_emails_email
  ON guest_emails(email);

CREATE INDEX IF NOT EXISTS idx_guest_emails_opted_out
  ON guest_emails(opted_out)
  WHERE opted_out = FALSE;

CREATE INDEX IF NOT EXISTS idx_guest_emails_last_analysis
  ON guest_emails(last_analysis_at DESC);

-- Column comments for documentation
COMMENT ON TABLE guest_emails IS 'Stores guest user emails for outreach campaigns';
COMMENT ON COLUMN guest_emails.email IS 'Guest email address (unique, deduplicated)';
COMMENT ON COLUMN guest_emails.first_captured_at IS 'Timestamp when email was first captured';
COMMENT ON COLUMN guest_emails.last_analysis_at IS 'Timestamp of most recent analysis by this email';
COMMENT ON COLUMN guest_emails.analysis_count IS 'Number of analyses performed by this email';
COMMENT ON COLUMN guest_emails.opted_out IS 'TRUE if user unsubscribed from communications';

-- Rollback instructions (for reference, do not execute):
-- DROP TABLE IF EXISTS guest_emails CASCADE;
