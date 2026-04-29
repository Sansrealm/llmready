-- Generic feature waitlist table.
-- Each row is one user expressing interest in a feature (identified by slug).
CREATE TABLE IF NOT EXISTS feature_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature VARCHAR(60) NOT NULL,
  email VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feature, email)
);

CREATE INDEX IF NOT EXISTS idx_feature_waitlist_feature ON feature_waitlist (feature);
