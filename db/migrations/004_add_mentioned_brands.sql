-- Migration 004: store extracted brand names per visibility result row
-- Run once against the production Vercel Postgres instance before deploying code.
-- Existing rows default to empty array; new rows populated from Haiku extraction pass.

ALTER TABLE ai_visibility_results
  ADD COLUMN IF NOT EXISTS mentioned_brands TEXT[] NOT NULL DEFAULT '{}';
