-- Migration 003: store cited source URLs per visibility result row
-- Run once against the production Vercel Postgres instance.
-- Existing rows default to empty array; new rows populated from scan engine responses.

ALTER TABLE ai_visibility_results
  ADD COLUMN IF NOT EXISTS cited_urls TEXT[] NOT NULL DEFAULT '{}';
