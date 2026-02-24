-- EdgeBook: Initial Schema Migration
-- Run this in your Supabase SQL editor or via supabase db push

-- ─────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username          TEXT UNIQUE NOT NULL,
  display_name      TEXT,
  avatar_url        TEXT,
  timezone          TEXT NOT NULL DEFAULT 'UTC',
  currency          TEXT NOT NULL DEFAULT 'USD',
  starting_bankroll NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_bankroll  NUMERIC(12,2) NOT NULL DEFAULT 0,
  peak_bankroll     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tier              TEXT NOT NULL DEFAULT 'novice'
                    CHECK (tier IN ('novice','bronze','silver','gold','platinum','elite')),
  tier_points       INTEGER NOT NULL DEFAULT 0,
  is_public         BOOLEAN NOT NULL DEFAULT false,
  onboarding_done   BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- USER SETTINGS
-- ─────────────────────────────────────────────
CREATE TABLE user_settings (
  user_id                    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  withdrawal_target          NUMERIC(12,2),
  withdrawal_percentage      NUMERIC(5,2),
  break_on_consecutive_losses INTEGER DEFAULT 7,
  break_on_drawdown_pct      NUMERIC(5,2) DEFAULT 20,
  daily_loss_limit           NUMERIC(12,2),
  weekly_loss_limit          NUMERIC(12,2),
  email_notifications        BOOLEAN DEFAULT true,
  push_notifications         BOOLEAN DEFAULT true,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BETS (core table)
-- ─────────────────────────────────────────────
CREATE TABLE bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Classification
  sport           TEXT NOT NULL,
  league          TEXT,
  event_name      TEXT NOT NULL,
  event_date      TIMESTAMPTZ NOT NULL,
  market          TEXT NOT NULL,
  selection       TEXT NOT NULL,
  bet_type        TEXT NOT NULL DEFAULT 'single'
                  CHECK (bet_type IN ('single','double','treble','acca','system','teaser','other')),

  -- Bookmaker
  bookmaker       TEXT NOT NULL,
  bet_reference   TEXT,

  -- Financial
  odds            NUMERIC(8,4) NOT NULL CHECK (odds > 1),
  stake           NUMERIC(12,2) NOT NULL CHECK (stake > 0),
  potential_payout NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(stake * odds, 2)) STORED,

  -- Result
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','won','lost','void','cashout','partial_cashout')),
  actual_payout   NUMERIC(12,2),
  profit_loss     NUMERIC(12,2) GENERATED ALWAYS AS (
                    CASE
                      WHEN status = 'won'              THEN ROUND((stake * odds) - stake, 2)
                      WHEN status = 'lost'             THEN -stake
                      WHEN status = 'void'             THEN 0
                      WHEN status IN ('cashout','partial_cashout') THEN actual_payout - stake
                      ELSE NULL
                    END
                  ) STORED,

  -- Metadata
  confidence      SMALLINT CHECK (confidence BETWEEN 1 AND 5),
  tags            TEXT[] DEFAULT '{}',
  notes           TEXT,

  -- OCR
  ocr_source_url  TEXT,
  ocr_raw_text    TEXT,
  ocr_parsed      BOOLEAN NOT NULL DEFAULT false,

  -- Time tracking
  placed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at      TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bets_user_status   ON bets(user_id, status);
CREATE INDEX idx_bets_user_sport    ON bets(user_id, sport);
CREATE INDEX idx_bets_user_placed   ON bets(user_id, placed_at DESC);
CREATE INDEX idx_bets_user_book     ON bets(user_id, bookmaker);
CREATE INDEX idx_bets_tags          ON bets USING GIN(tags);

-- ─────────────────────────────────────────────
-- BET LEGS (for accumulators / system bets)
-- ─────────────────────────────────────────────
CREATE TABLE bet_legs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id        UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  sport         TEXT NOT NULL,
  league        TEXT,
  event_name    TEXT NOT NULL,
  event_date    TIMESTAMPTZ NOT NULL,
  market        TEXT NOT NULL,
  selection     TEXT NOT NULL,
  odds          NUMERIC(8,4) NOT NULL,

  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','won','lost','void')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_legs_bet_id ON bet_legs(bet_id);
CREATE INDEX idx_bet_legs_user   ON bet_legs(user_id);

-- ─────────────────────────────────────────────
-- BANKROLL SNAPSHOTS (daily cron)
-- ─────────────────────────────────────────────
CREATE TABLE bankroll_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  bankroll      NUMERIC(12,2) NOT NULL,
  daily_pl      NUMERIC(12,2) NOT NULL DEFAULT 0,
  cumulative_pl NUMERIC(12,2) NOT NULL DEFAULT 0,
  bets_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON bankroll_snapshots(user_id, snapshot_date DESC);

-- ─────────────────────────────────────────────
-- RISK ALERTS
-- ─────────────────────────────────────────────
CREATE TABLE risk_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bet_id        UUID REFERENCES bets(id),

  alert_type    TEXT NOT NULL CHECK (alert_type IN (
                  'tilt_detection',
                  'concentration_risk',
                  'losing_streak',
                  'drawdown_alert',
                  'late_night_betting',
                  'rapid_betting',
                  'odds_bias',
                  'correlation_risk',
                  'monthly_trend_degradation',
                  'ev_variance_mismatch'
                )),
  severity      TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',

  dismissed_at  TIMESTAMPTZ,
  override_at   TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_type    ON risk_alerts(user_id, alert_type);
CREATE INDEX idx_alerts_user_created ON risk_alerts(user_id, created_at DESC);
CREATE INDEX idx_alerts_active       ON risk_alerts(user_id, dismissed_at) WHERE dismissed_at IS NULL;

-- ─────────────────────────────────────────────
-- WITHDRAWAL TARGETS
-- ─────────────────────────────────────────────
CREATE TABLE withdrawal_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  target_type     TEXT NOT NULL CHECK (target_type IN ('fixed_profit','percentage_monthly','custom')),
  target_amount   NUMERIC(12,2),
  target_pct      NUMERIC(5,2),
  description     TEXT,

  is_active       BOOLEAN NOT NULL DEFAULT true,
  triggered_at    TIMESTAMPTZ,
  fulfilled_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- MONTE CARLO RESULTS (cached projections)
-- ─────────────────────────────────────────────
CREATE TABLE monte_carlo_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  projection_days  INTEGER NOT NULL,
  num_simulations  INTEGER NOT NULL DEFAULT 10000,

  -- Percentile arrays: one value per day
  percentile_5     NUMERIC(12,2)[],
  percentile_25    NUMERIC(12,2)[],
  percentile_50    NUMERIC(12,2)[],
  percentile_75    NUMERIC(12,2)[],
  percentile_95    NUMERIC(12,2)[],

  ruin_probability        NUMERIC(8,6),
  breakeven_days          INTEGER,
  expected_value          NUMERIC(12,2),
  max_drawdown_simulated  NUMERIC(8,4),
  loss_streak_90th_pct    INTEGER,

  invalidated_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monte_carlo_valid ON monte_carlo_results(user_id, computed_at DESC)
  WHERE invalidated_at IS NULL;

-- ─────────────────────────────────────────────
-- OCR JOBS
-- ─────────────────────────────────────────────
CREATE TABLE ocr_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  storage_path    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','processing','completed','failed','rejected')),

  raw_vision_json JSONB,
  parsed_fields   JSONB,
  confidence_pct  NUMERIC(5,2),

  error_message   TEXT,
  retry_count     SMALLINT NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ocr_jobs_user ON ocr_jobs(user_id, status);

-- ─────────────────────────────────────────────
-- ACHIEVEMENTS
-- ─────────────────────────────────────────────
CREATE TABLE achievement_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  tier_req    TEXT,
  points      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id),
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata       JSONB DEFAULT '{}',

  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements ON user_achievements(user_id);

-- ─────────────────────────────────────────────
-- LEADERBOARD SNAPSHOTS (monthly, anonymized)
-- ─────────────────────────────────────────────
CREATE TABLE leaderboard_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_month  DATE NOT NULL,

  display_alias   TEXT NOT NULL,
  tier            TEXT NOT NULL,

  monthly_roi_pct  NUMERIC(8,4),
  monthly_pl       NUMERIC(12,2),
  total_bets       INTEGER,
  win_rate_pct     NUMERIC(8,4),
  discipline_score NUMERIC(5,2),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, snapshot_month)
);

CREATE INDEX idx_leaderboard_month_roi  ON leaderboard_snapshots(snapshot_month, monthly_roi_pct DESC);
CREATE INDEX idx_leaderboard_month_tier ON leaderboard_snapshots(snapshot_month, tier);

-- ─────────────────────────────────────────────
-- SHARE CARDS
-- ─────────────────────────────────────────────
CREATE TABLE share_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug        TEXT UNIQUE NOT NULL,
  card_type   TEXT NOT NULL CHECK (card_type IN ('monthly','alltime','streak','achievement')),
  metadata    JSONB NOT NULL DEFAULT '{}',
  expires_at  TIMESTAMPTZ,
  views       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_share_cards_slug ON share_cards(slug);
