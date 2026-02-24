-- EdgeBook: Triggers and Functions

-- ─────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER bets_updated_at
  BEFORE UPDATE ON bets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER withdrawal_targets_updated_at
  BEFORE UPDATE ON withdrawal_targets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER ocr_jobs_updated_at
  BEFORE UPDATE ON ocr_jobs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ─────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base username from email or metadata
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  -- Sanitize: lowercase, remove special chars, max 20 chars
  base_username := LOWER(REGEXP_REPLACE(base_username, '[^a-z0-9_]', '', 'g'));
  base_username := LEFT(base_username, 20);
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user';
  END IF;

  -- Ensure unique username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', final_username),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create default user settings
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- ON BET SETTLED: update bankroll + invalidate MC cache
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_bet_settled()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to a settled state
  IF NEW.status != OLD.status
     AND NEW.status IN ('won','lost','void','cashout','partial_cashout')
     AND NEW.profit_loss IS NOT NULL THEN

    -- Update bankroll and peak on profile
    UPDATE profiles
    SET
      current_bankroll = current_bankroll + NEW.profit_loss,
      peak_bankroll = GREATEST(peak_bankroll, current_bankroll + NEW.profit_loss),
      updated_at = NOW()
    WHERE id = NEW.user_id;

    -- Invalidate Monte Carlo cache (forces recompute on next request)
    UPDATE monte_carlo_results
    SET invalidated_at = NOW()
    WHERE user_id = NEW.user_id AND invalidated_at IS NULL;

    -- Record settled_at timestamp
    IF NEW.settled_at IS NULL THEN
      NEW.settled_at := NOW();
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_bet_settled
  BEFORE UPDATE ON bets
  FOR EACH ROW EXECUTE FUNCTION handle_bet_settled();

-- ─────────────────────────────────────────────
-- ON BET CREATED: update bankroll (deduct stake for pending)
-- Note: we don't deduct stake on creation — bankroll represents
-- realized P&L only. pending bets show as "at risk" exposure.
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- ANALYTICS HELPER FUNCTION
-- Returns P&L summary for a user without exposing raw data
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_pl_summary(
  p_user_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_pl         NUMERIC,
  total_stake      NUMERIC,
  roi_pct          NUMERIC,
  win_count        BIGINT,
  loss_count       BIGINT,
  void_count       BIGINT,
  total_settled    BIGINT,
  win_rate_pct     NUMERIC,
  avg_odds         NUMERIC,
  avg_stake        NUMERIC,
  best_win         NUMERIC,
  worst_loss       NUMERIC
)
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(profit_loss), 0)                                     AS total_pl,
    COALESCE(SUM(stake), 0)                                           AS total_stake,
    CASE
      WHEN SUM(stake) > 0 THEN ROUND((SUM(profit_loss) / SUM(stake)) * 100, 2)
      ELSE 0
    END                                                               AS roi_pct,
    COUNT(*) FILTER (WHERE status = 'won')                            AS win_count,
    COUNT(*) FILTER (WHERE status = 'lost')                           AS loss_count,
    COUNT(*) FILTER (WHERE status = 'void')                           AS void_count,
    COUNT(*) FILTER (WHERE status IN ('won','lost','cashout','partial_cashout')) AS total_settled,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('won','lost')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'won')::NUMERIC /
        COUNT(*) FILTER (WHERE status IN ('won','lost')) * 100, 2
      )
      ELSE 0
    END                                                               AS win_rate_pct,
    ROUND(AVG(odds), 4)                                               AS avg_odds,
    ROUND(AVG(stake), 2)                                              AS avg_stake,
    MAX(profit_loss) FILTER (WHERE status = 'won')                    AS best_win,
    MIN(profit_loss) FILTER (WHERE status = 'lost')                   AS worst_loss
  FROM bets
  WHERE user_id = p_user_id
    AND deleted_at IS NULL
    AND status != 'pending'
    AND (p_from IS NULL OR placed_at >= p_from)
    AND (p_to IS NULL OR placed_at <= p_to)
$$;
