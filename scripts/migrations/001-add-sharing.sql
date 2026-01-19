-- Migration: Add sharing functionality to analyses table
-- Created: 2026-01-19
-- Purpose: Enable public sharing of analysis reports with 30-day expiry
--
-- This migration adds four columns to support public sharing:
-- 1. share_slug: Unique identifier for public share URLs
-- 2. is_public: Flag to control public visibility
-- 3. shared_at: Timestamp tracking when sharing was enabled
-- 4. share_expires_at: Expiration timestamp (30 days from shared_at)

-- Add sharing columns
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS share_slug VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

-- Create indexes for performance
-- Partial index for fast public lookups (only indexes rows where is_public = TRUE)
CREATE INDEX IF NOT EXISTS idx_analyses_share_slug_public
  ON analyses(share_slug)
  WHERE is_public = TRUE;

-- Unique index to enforce share_slug uniqueness across all rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_share_slug_unique
  ON analyses(share_slug);

-- Index for efficient expiration cleanup queries
CREATE INDEX IF NOT EXISTS idx_analyses_share_expires_at
  ON analyses(share_expires_at)
  WHERE is_public = TRUE;

-- Add column comments for documentation
COMMENT ON COLUMN analyses.share_slug IS 'Unique slug for public sharing URLs (e.g., abc123xyz). NULL if not shared.';
COMMENT ON COLUMN analyses.is_public IS 'Whether this analysis is publicly accessible via share link';
COMMENT ON COLUMN analyses.shared_at IS 'Timestamp when sharing was first enabled for this analysis';
COMMENT ON COLUMN analyses.share_expires_at IS 'Timestamp when share link expires (typically 30 days from shared_at)';

-- Rollback instructions (for reference, do not execute):
-- DROP INDEX IF EXISTS idx_analyses_share_slug_public;
-- DROP INDEX IF EXISTS idx_analyses_share_slug_unique;
-- DROP INDEX IF EXISTS idx_analyses_share_expires_at;
-- ALTER TABLE analyses DROP COLUMN IF EXISTS share_slug;
-- ALTER TABLE analyses DROP COLUMN IF EXISTS is_public;
-- ALTER TABLE analyses DROP COLUMN IF EXISTS shared_at;
-- ALTER TABLE analyses DROP COLUMN IF EXISTS share_expires_at;
