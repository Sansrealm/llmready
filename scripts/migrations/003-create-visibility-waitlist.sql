-- Migration: Create visibility_waitlist table
-- Created: 2026-02-14
-- Purpose: Track interest signups for the AI Visibility Tracking feature
--
-- Rollback: DROP TABLE IF EXISTS visibility_waitlist;

CREATE TABLE IF NOT EXISTS visibility_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  url VARCHAR(2048),
  industry VARCHAR(50),
  user_id VARCHAR(255),
  source VARCHAR(50) DEFAULT 'results_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_visibility_waitlist_created ON visibility_waitlist(created_at DESC);
