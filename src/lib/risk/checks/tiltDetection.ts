import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Tilt Detection: Stake significantly larger than average after consecutive losses
 * Signs of chasing — one of the most dangerous patterns
 */
export function tiltDetection(ctx: RiskContext, newStake?: number): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'tilt_detection',
    severity: 'critical',
    title: '',
    message: '',
    metadata: {},
  }

  const settled = ctx.bets.filter(b => b.status === 'lost' || b.status === 'won')
  if (settled.length < 3) return result

  // Get last 3 settled bets
  const last3 = settled.slice(0, 3)
  const consecutiveLosses = last3.filter(b => b.status === 'lost').length

  if (consecutiveLosses < 2) return result

  const stake = newStake ?? ctx.avgStake
  const stakeMultiple = ctx.avgStake > 0 ? stake / ctx.avgStake : 1

  if (stakeMultiple >= 2) {
    result.triggered = true
    result.severity = stakeMultiple >= 3 ? 'critical' : 'warning'
    result.title = 'Possible tilt detected — stake spike after losses'
    result.message = `Your stake is ${stakeMultiple.toFixed(1)}x your average after ${consecutiveLosses} consecutive losses. This is a common sign of chasing losses. Consider reducing to your standard unit size.`
    result.metadata = {
      consecutive_losses: consecutiveLosses,
      stake_multiple: stakeMultiple,
      avg_stake: ctx.avgStake,
      current_stake: stake,
    }
  }

  return result
}
