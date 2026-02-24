import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Rapid Betting: Too many bets placed in a short time window
 * Indicator of impulsive/emotional betting
 */
export function rapidBetting(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'rapid_betting',
    severity: 'warning',
    title: '',
    message: '',
    metadata: {},
  }

  const recentCount = ctx.recentBets.length

  if (recentCount < 4) return result

  result.triggered = true
  result.severity = recentCount >= 8 ? 'critical' : 'warning'
  result.title = `${recentCount} bets in the last 30 minutes`
  result.message = `You've placed ${recentCount} bets in the last 30 minutes. Rapid-fire betting is often emotional and leads to poor selections. Slow down and evaluate each bet independently.`
  result.metadata = {
    bets_in_30_min: recentCount,
    threshold: 4,
  }

  return result
}
