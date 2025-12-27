-- Rate Limits Table Migration
-- This table stores rate limit tracking data for time-based throttling

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- Unique identifier (user:userId or api_key:keyId)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start INTEGER NOT NULL, -- Unix timestamp of window start
  window_seconds INTEGER NOT NULL, -- Window duration in seconds
  request_count INTEGER NOT NULL DEFAULT 1,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for fast lookups
  UNIQUE(identifier, window_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON rate_limits(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own rate limit records
CREATE POLICY "Users can view own rate limits"
  ON rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for server-side operations)
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comment
COMMENT ON TABLE rate_limits IS 'Tracks rate limit usage for time-based throttling (per-minute/hour limits)';

