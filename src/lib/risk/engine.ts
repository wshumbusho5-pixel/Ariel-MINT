import type { RiskCheckResult, RiskContext, BetForRisk } from './types'
import { tiltDetection } from './checks/tiltDetection'
import { concentrationRisk } from './checks/concentrationRisk'
import { losingStreak } from './checks/losingStreak'
import { drawdownAlert } from './checks/drawdownAlert'
import { lateNightBetting } from './checks/lateNightBetting'
import { rapidBetting } from './checks/rapidBetting'
import { oddsBias } from './checks/oddsBias'
import { correlationRisk } from './checks/correlationRisk'
import { monthlyTrend } from './checks/monthlyTrend'
import { evVarianceMismatch } from './checks/evVarianceMismatch'

export interface RiskEngineInput {
  userId: string
  betId?: string
  bets: BetForRisk[]           // last 90 days
  recentBets: BetForRisk[]     // last 30 minutes
  currentBankroll: number
  peakBankroll: number
  timezone: string
  newStake?: number            // stake of the new bet being placed
}

export type { RiskCheckResult }

/**
 * Run all 10 risk checks in parallel and return triggered results
 */
export async function runRiskChecks(input: RiskEngineInput): Promise<RiskCheckResult[]> {
  const settled = input.bets.filter(b => ['won','lost'].includes(b.status))
  const last20Stakes = settled.slice(0, 20).map(b => b.stake)
  const avgStake = last20Stakes.length > 0
    ? last20Stakes.reduce((a, b) => a + b, 0) / last20Stakes.length
    : 0

  const ctx: RiskContext = {
    userId: input.userId,
    betId: input.betId,
    bets: input.bets,
    recentBets: input.recentBets,
    currentBankroll: input.currentBankroll,
    peakBankroll: input.peakBankroll,
    avgStake,
    timezone: input.timezone,
  }

  // Run all checks concurrently
  const results = await Promise.all([
    Promise.resolve(tiltDetection(ctx, input.newStake)),
    Promise.resolve(concentrationRisk(ctx)),
    Promise.resolve(losingStreak(ctx)),
    Promise.resolve(drawdownAlert(ctx)),
    Promise.resolve(lateNightBetting(ctx)),
    Promise.resolve(rapidBetting(ctx)),
    Promise.resolve(oddsBias(ctx)),
    Promise.resolve(correlationRisk(ctx)),
    Promise.resolve(monthlyTrend(ctx)),
    Promise.resolve(evVarianceMismatch(ctx)),
  ])

  return results.filter(r => r.triggered)
}
