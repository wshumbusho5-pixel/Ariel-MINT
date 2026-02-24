// EdgeBook: TypeScript types mirroring the database schema
// In production, generate these with: npx supabase gen types typescript

export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'cashout' | 'partial_cashout'
export type BetType = 'single' | 'double' | 'treble' | 'acca' | 'system' | 'teaser' | 'other'
export type Tier = 'novice' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'elite'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertType =
  | 'tilt_detection'
  | 'concentration_risk'
  | 'losing_streak'
  | 'drawdown_alert'
  | 'late_night_betting'
  | 'rapid_betting'
  | 'odds_bias'
  | 'correlation_risk'
  | 'monthly_trend_degradation'
  | 'ev_variance_mismatch'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  timezone: string
  currency: string
  starting_bankroll: number
  current_bankroll: number
  peak_bankroll: number
  tier: Tier
  tier_points: number
  is_public: boolean
  onboarding_done: boolean
  created_at: string
  updated_at: string
}

export interface UserSettings {
  user_id: string
  withdrawal_target: number | null
  withdrawal_percentage: number | null
  break_on_consecutive_losses: number
  break_on_drawdown_pct: number
  daily_loss_limit: number | null
  weekly_loss_limit: number | null
  email_notifications: boolean
  push_notifications: boolean
  created_at: string
  updated_at: string
}

export interface Bet {
  id: string
  user_id: string
  sport: string
  league: string | null
  event_name: string
  event_date: string
  market: string
  selection: string
  bet_type: BetType
  bookmaker: string
  bet_reference: string | null
  odds: number
  stake: number
  potential_payout: number  // generated
  status: BetStatus
  actual_payout: number | null
  profit_loss: number | null  // generated
  confidence: number | null
  tags: string[]
  notes: string | null
  ocr_source_url: string | null
  ocr_raw_text: string | null
  ocr_parsed: boolean
  placed_at: string
  settled_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // joined
  legs?: BetLeg[]
}

export interface BetLeg {
  id: string
  bet_id: string
  user_id: string
  sport: string
  league: string | null
  event_name: string
  event_date: string
  market: string
  selection: string
  odds: number
  status: 'pending' | 'won' | 'lost' | 'void'
  created_at: string
}

export interface BankrollSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  bankroll: number
  daily_pl: number
  cumulative_pl: number
  bets_count: number
  created_at: string
}

export interface RiskAlert {
  id: string
  user_id: string
  bet_id: string | null
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  metadata: Record<string, unknown>
  dismissed_at: string | null
  override_at: string | null
  created_at: string
}

export interface WithdrawalTarget {
  id: string
  user_id: string
  target_type: 'fixed_profit' | 'percentage_monthly' | 'custom'
  target_amount: number | null
  target_pct: number | null
  description: string | null
  is_active: boolean
  triggered_at: string | null
  fulfilled_at: string | null
  created_at: string
  updated_at: string
}

export interface MonteCarloResult {
  id: string
  user_id: string
  computed_at: string
  projection_days: number
  num_simulations: number
  percentile_5: number[]
  percentile_25: number[]
  percentile_50: number[]
  percentile_75: number[]
  percentile_95: number[]
  ruin_probability: number
  breakeven_days: number | null
  expected_value: number
  max_drawdown_simulated: number
  loss_streak_90th_pct: number
  invalidated_at: string | null
  created_at: string
}

export interface OcrJob {
  id: string
  user_id: string
  storage_path: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'rejected'
  raw_vision_json: Record<string, unknown> | null
  parsed_fields: ParsedBetFields | null
  confidence_pct: number | null
  error_message: string | null
  retry_count: number
  created_at: string
  updated_at: string
}

export interface ParsedBetFields {
  sport?: string
  league?: string
  event_name?: string
  event_date?: string
  market?: string
  selection?: string
  bookmaker?: string
  bet_reference?: string
  odds?: number
  stake?: number
  bet_type?: BetType
  confidence?: number
  notes?: string
  tags?: string[]
  placed_at?: string
  confidence_scores?: Record<string, number>  // per-field confidence 0-1
}

export interface AchievementDefinition {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  tier_req: Tier | null
  points: number
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
  metadata: Record<string, unknown>
  achievement?: AchievementDefinition
}

export interface LeaderboardSnapshot {
  id: string
  user_id: string
  snapshot_month: string
  display_alias: string
  tier: Tier
  monthly_roi_pct: number | null
  monthly_pl: number | null
  total_bets: number | null
  win_rate_pct: number | null
  discipline_score: number | null
  created_at: string
}

export interface ShareCard {
  id: string
  user_id: string
  slug: string
  card_type: 'monthly' | 'alltime' | 'streak' | 'achievement'
  metadata: Record<string, unknown>
  expires_at: string | null
  views: number
  created_at: string
}

// Analytics types
export interface PLSummary {
  total_pl: number
  total_stake: number
  roi_pct: number
  win_count: number
  loss_count: number
  void_count: number
  total_settled: number
  win_rate_pct: number
  avg_odds: number
  avg_stake: number
  best_win: number | null
  worst_loss: number | null
}

export interface BreakdownEntry {
  label: string
  total_pl: number
  total_stake: number
  roi_pct: number
  win_count: number
  loss_count: number
  total_bets: number
  win_rate_pct: number
}
