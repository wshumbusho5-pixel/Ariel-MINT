import type { RiskCheckResult, RiskContext } from '../types'

/**
 * EV/Variance Mismatch: Results significantly deviate from what odds imply
 * Detects both extreme bad luck (sustainable) and lucky runs (fragile)
 */
export function evVarianceMismatch(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'ev_variance_mismatch',
    severity: 'info',
    title: '',
    message: '',
    metadata: {},
  }

  const settled = ctx.bets.filter(b => ['won','lost'].includes(b.status))
  if (settled.length < 30) return result

  // Calculate expected wins from implied probabilities
  const expectedWins = settled.reduce((sum, b) => sum + (1 / b.odds), 0)
  const actualWins = settled.filter(b => b.status === 'won').length

  // Standard deviation of a binomial: sqrt(n * p * (1-p))
  const avgImpliedProb = expectedWins / settled.length
  const stdDev = Math.sqrt(settled.length * avgImpliedProb * (1 - avgImpliedProb))

  const zScore = (actualWins - expectedWins) / stdDev

  // Alert on extreme variance (beyond 2 sigma in either direction)
  if (Math.abs(zScore) > 2.0) {
    result.triggered = true

    if (zScore < -2) {
      // Running well below expected — bad luck
      result.severity = zScore < -3 ? 'warning' : 'info'
      result.title = 'You may be running on bad luck — not necessarily bad picks'
      result.message = `Based on your odds, you'd expect to win ~${expectedWins.toFixed(0)} bets, but you've won ${actualWins}. This is ${Math.abs(zScore).toFixed(1)} standard deviations below expected — statistically unusual. Don't abandon a working strategy due to variance.`
      result.metadata = {
        expected_wins: expectedWins,
        actual_wins: actualWins,
        z_score: zScore,
        direction: 'negative',
        total_bets: settled.length,
      }
    } else {
      // Running above expected — lucky run
      result.severity = 'info'
      result.title = 'Your recent results may reflect luck, not just edge'
      result.message = `You've won ${actualWins} bets vs an expected ${expectedWins.toFixed(0)} — ${Math.abs(zScore).toFixed(1)} standard deviations above expected. Part of this may be luck. Avoid increasing stakes based on a hot streak — variance can reverse quickly.`
      result.metadata = {
        expected_wins: expectedWins,
        actual_wins: actualWins,
        z_score: zScore,
        direction: 'positive',
        total_bets: settled.length,
      }
    }
  }

  return result
}
