-- FlowB: Pending Verifications Table
-- This table stores verification codes for linking chat platforms to DANZ.Now accounts

CREATE TABLE IF NOT EXISTS pending_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Verification code (e.g., "ABC123")
  code VARCHAR(10) NOT NULL UNIQUE,

  -- Platform info (telegram, discord, farcaster, openclaw)
  platform VARCHAR(20) NOT NULL,
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Link to DANZ user (filled when verification completes)
  danz_privy_id VARCHAR(255) REFERENCES users(privy_id),

  -- Indexes
  CONSTRAINT unique_pending_platform_user
    UNIQUE (platform, platform_user_id, code)
);

-- Index for code lookup (used during verification)
CREATE INDEX IF NOT EXISTS idx_pending_verifications_code
  ON pending_verifications(code)
  WHERE verified_at IS NULL;

-- Index for checking user's pending verifications
CREATE INDEX IF NOT EXISTS idx_pending_verifications_platform_user
  ON pending_verifications(platform, platform_user_id);

-- Index for cleanup of expired verifications
CREATE INDEX IF NOT EXISTS idx_pending_verifications_expires
  ON pending_verifications(expires_at)
  WHERE verified_at IS NULL;

-- RLS Policies (if RLS is enabled)
ALTER TABLE pending_verifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can do everything" ON pending_verifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to complete verification (called from danz.now web app)
CREATE OR REPLACE FUNCTION complete_verification(
  p_code VARCHAR(10),
  p_privy_id VARCHAR(255)
) RETURNS JSONB AS $$
DECLARE
  v_verification pending_verifications%ROWTYPE;
  v_user users%ROWTYPE;
BEGIN
  -- Find the pending verification
  SELECT * INTO v_verification
  FROM pending_verifications
  WHERE code = p_code
    AND verified_at IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification code'
    );
  END IF;

  -- Get the user
  SELECT * INTO v_user
  FROM users
  WHERE privy_id = p_privy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Complete the verification
  UPDATE pending_verifications
  SET verified_at = NOW(),
      danz_privy_id = p_privy_id
  WHERE id = v_verification.id;

  -- Update user with platform ID
  IF v_verification.platform = 'telegram' THEN
    UPDATE users SET telegram_id = v_verification.platform_user_id
    WHERE privy_id = p_privy_id;
  ELSIF v_verification.platform = 'farcaster' THEN
    UPDATE users SET farcaster_fid = v_verification.platform_user_id
    WHERE privy_id = p_privy_id;
  END IF;

  -- Award signup points (50 XP)
  UPDATE users
  SET xp = COALESCE(xp, 0) + 50,
      updated_at = NOW()
  WHERE privy_id = p_privy_id;

  RETURN jsonb_build_object(
    'success', true,
    'username', v_user.username,
    'display_name', v_user.display_name,
    'platform', v_verification.platform,
    'platform_user_id', v_verification.platform_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired verifications
CREATE OR REPLACE FUNCTION cleanup_expired_verifications() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pending_verifications
  WHERE verified_at IS NULL
    AND expires_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE pending_verifications IS 'Stores verification codes for linking chat platforms (Telegram, Discord, etc.) to DANZ.Now accounts';
COMMENT ON FUNCTION complete_verification IS 'Completes a verification, linking a platform user to a DANZ account and awarding signup points';
