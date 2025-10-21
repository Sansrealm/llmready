-- LLM Check Analysis History Schema
-- This table stores historical analysis results for tracking score trends

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  normalized_url VARCHAR(2048) NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  parameters JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_normalized_url ON analyses(normalized_url);
CREATE INDEX IF NOT EXISTS idx_analyses_user_url ON analyses(user_id, normalized_url, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_analyzed_at ON analyses(analyzed_at DESC);

-- Comment for documentation
COMMENT ON TABLE analyses IS 'Stores historical website analysis results for trend tracking';
COMMENT ON COLUMN analyses.normalized_url IS 'Normalized URL for grouping same sites (lowercase, https, no trailing slash)';
COMMENT ON COLUMN analyses.parameters IS 'JSON array of analysis parameters with scores';
