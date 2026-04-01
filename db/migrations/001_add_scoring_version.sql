-- Migration 001: Add scoring_version to analyses table
--
-- Run BEFORE deploying the v2 parameter overhaul.
-- Non-destructive: existing rows default to 'v1' (legacy open-ended parameters).
-- New analyses written by v2 code will have scoring_version = 'v2'.
--
-- The score history chart uses this column to render a v1→v2 boundary marker,
-- so users understand a step change in their trend chart is a methodology
-- update, not a performance drop.

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS scoring_version VARCHAR(20) DEFAULT 'v1';

-- Backfill: any existing rows without a value get 'v1'
UPDATE analyses
  SET scoring_version = 'v1'
  WHERE scoring_version IS NULL;
