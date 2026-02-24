-- EdgeBook: Row Level Security Policies

-- Enable RLS on all user-owned tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE monte_carlo_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_cards ENABLE ROW LEVEL SECURITY;

-- Achievements catalog: readable by all authenticated users
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_readable_by_all" ON achievement_definitions
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── PROFILES ───
CREATE POLICY "profiles_own_all" ON profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public profiles readable by authenticated users (for leaderboard)
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');

-- ─── USER SETTINGS ───
CREATE POLICY "settings_own_all" ON user_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── BETS ───
CREATE POLICY "bets_own_all" ON bets
  FOR ALL USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- ─── BET LEGS ───
CREATE POLICY "bet_legs_own_all" ON bet_legs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── BANKROLL SNAPSHOTS ───
CREATE POLICY "snapshots_own_all" ON bankroll_snapshots
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── RISK ALERTS ───
CREATE POLICY "alerts_own_all" ON risk_alerts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── WITHDRAWAL TARGETS ───
CREATE POLICY "withdrawals_own_all" ON withdrawal_targets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── MONTE CARLO ───
CREATE POLICY "monte_carlo_own_all" ON monte_carlo_results
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── OCR JOBS ───
CREATE POLICY "ocr_jobs_own_all" ON ocr_jobs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── USER ACHIEVEMENTS ───
CREATE POLICY "achievements_own_all" ON user_achievements
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── LEADERBOARD SNAPSHOTS ───
-- Authenticated users can read snapshots where the profile is public
CREATE POLICY "leaderboard_public_read" ON leaderboard_snapshots
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = leaderboard_snapshots.user_id AND p.is_public = true
    )
  );

-- Users can see their own snapshot even if not public
CREATE POLICY "leaderboard_own_read" ON leaderboard_snapshots
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can write leaderboard snapshots (via Inngest)
CREATE POLICY "leaderboard_service_write" ON leaderboard_snapshots
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─── SHARE CARDS ───
-- Owner can manage their cards
CREATE POLICY "share_cards_own_all" ON share_cards
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read non-expired share cards by slug (for public pages)
CREATE POLICY "share_cards_public_read" ON share_cards
  FOR SELECT USING (expires_at IS NULL OR expires_at > NOW());
