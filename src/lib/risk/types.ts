import type { AlertType, AlertSeverity } from '@/types/database'

export interface RiskCheckResult {
  triggered: boolean
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  metadata: Record<string, unknown>
}

export interface BetForRisk {
  id: string
  sport: string
  bookmaker: string
  event_name: string
  selection: string
  odds: number
  stake: number
  status: string
  profit_loss: number | null
  placed_at: string
  settled_at: string | null
}

export interface RiskContext {
  userId: string
  betId?: string
  bets: BetForRisk[]          // last 90 days settled bets
  recentBets: BetForRisk[]    // last 30 minutes (all bets)
  currentBankroll: number
  peakBankroll: number
  avgStake: number             // average stake of last 20 settled bets
  timezone: string
}
