-- 005_llm_spend.sql
-- Per-call LLM spend ledger. One row per outbound provider request.
-- Step 1 of spend tracking — read-only logging, no budget enforcement yet.
--
-- Run manually via Neon console. Idempotent (CREATE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS llm_spend (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(255)   NOT NULL,
  endpoint      VARCHAR(64)    NOT NULL,
  provider      VARCHAR(32)    NOT NULL,
  model         VARCHAR(64)    NOT NULL,
  tokens_in     INTEGER        NOT NULL DEFAULT 0,
  tokens_out    INTEGER        NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
  request_id    VARCHAR(128),
  analysis_id   UUID,
  scan_id       UUID,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_spend_user_time
  ON llm_spend (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_spend_endpoint_time
  ON llm_spend (endpoint, created_at DESC);

-- Useful for spend rollups by provider over time ranges.
CREATE INDEX IF NOT EXISTS idx_llm_spend_provider_time
  ON llm_spend (provider, created_at DESC);
