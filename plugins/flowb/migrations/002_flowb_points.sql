-- FlowB Points System
-- Unified cross-platform points, milestones, streaks, and referrals

-- ============================================================================
-- Table 1: flowb_points_ledger (append-only audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup for daily cap queries
CREATE INDEX IF NOT EXISTS idx_flowb_ledger_user_platform
  ON flowb_points_ledger(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_flowb_ledger_daily_cap
  ON flowb_points_ledger(user_id, platform, action, created_at);

-- ============================================================================
-- Table 2: flowb_user_points (aggregated balances)
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  total_points INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  first_actions JSONB DEFAULT '{}',
  milestone_level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_flowb_user_points_referral
  ON flowb_user_points(referral_code)
  WHERE referral_code IS NOT NULL;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE flowb_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ledger" ON flowb_points_ledger
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on user_points" ON flowb_user_points
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE flowb_points_ledger IS 'Append-only audit trail for all FlowB point awards';
COMMENT ON TABLE flowb_user_points IS 'Aggregated user point balances, streaks, and referral codes';
