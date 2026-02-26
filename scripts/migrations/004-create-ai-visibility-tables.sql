-- Migration: Create AI Visibility scan tables
-- Created: 2026-02-26
-- Purpose: Store AI visibility scan results (ChatGPT, Gemini, Perplexity)
--          with 72-hour URL-level caching and historical trend tracking
--
-- Design notes:
--   - Scans are URL-level (shared across users) to control API costs
--   - Cache TTL is 72 hours — LLMs don't re-index sites faster than that
--   - append-only (no upsert) so trend data accumulates over time
--   - ai_visibility_results rows are deleted automatically when parent scan is deleted (CASCADE)
--
-- Rollback:
--   DROP TABLE IF EXISTS ai_visibility_results;
--   DROP TABLE IF EXISTS ai_visibility_scans;

-- ── Scan header ───────────────────────────────────────────────────────────────
-- One row per URL scan. Stores the aggregate score for trend queries.

CREATE TABLE IF NOT EXISTS ai_visibility_scans (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_url VARCHAR(2048) NOT NULL,
  industry       VARCHAR(50),
  total_found    INTEGER      NOT NULL,
  total_queries  INTEGER      NOT NULL DEFAULT 15,
  scanned_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Cache lookup: latest scan for a URL within the 72-hour window
CREATE INDEX IF NOT EXISTS idx_ai_visibility_scans_url_date
  ON ai_visibility_scans (normalized_url, scanned_at DESC);

-- ── Scan detail ───────────────────────────────────────────────────────────────
-- 15 rows per scan (5 prompts × 3 models). Deleted with parent via CASCADE.

CREATE TABLE IF NOT EXISTS ai_visibility_results (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id  UUID        NOT NULL REFERENCES ai_visibility_scans(id) ON DELETE CASCADE,
  model    VARCHAR(50) NOT NULL,  -- 'chatgpt' | 'gemini' | 'perplexity'
  prompt   TEXT        NOT NULL,
  found    BOOLEAN     NOT NULL,
  snippet  TEXT                   -- excerpt from AI response where brand was mentioned
);

-- Fast detail fetch for a given scan
CREATE INDEX IF NOT EXISTS idx_ai_visibility_results_scan_id
  ON ai_visibility_results (scan_id);
