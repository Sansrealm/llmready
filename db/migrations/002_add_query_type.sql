-- Migration 002: Add query_type to ai_visibility_results table
--
-- Run BEFORE deploying the updated ai-visibility-scan route.
-- Non-destructive: existing rows will have NULL query_type (pre-annotation).
-- New scan rows written after this migration will have the query type
-- (brand | problem | category | comparison) stored per result, enabling
-- bucket-level breakdown without fragile text-match joins.

ALTER TABLE ai_visibility_results
  ADD COLUMN IF NOT EXISTS query_type VARCHAR(20);
