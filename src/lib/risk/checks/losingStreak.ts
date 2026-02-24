import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Losing Streak Alert: Current streak beyond historical 90th percentile
 */
export function losingStreak(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'losing_streak',
    severity: 'critical',
    title: '',
    message: '',
    metadata: {},
  }

  const settled = ctx.bets.filter(b => ['won','lost'].includes(b.status))
  if (settled.length < 10) return result

  // Calculate all historical losing streaks
  const streaks: number[] = []
  let currentStreak = 0
  let runningStreak = 0

  for (const bet of settled) {
    if (bet.status === 'lost') {
      runningStreak++
    } else {
      if (runningStreak > 0) streaks.push(runningStreak)
      runningStreak = 0
    }
  }
  if (runningStreak > 0) currentStreak = runningStreak

  if (currentStreak === 0 || streaks.length < 3) return result

  // 90th percentile streak length
  streaks.sort((a, b) => a - b)
  const p90Index = Math.floor(streaks.length * 0.9)
  const p90Streak = streaks[p90Index] ?? streaks[streaks.length - 1]

  if (currentStreak >= p90Streak) {
    result.triggered = true
    result.severity = currentStreak >= p90Streak * 1.5 ? 'critical' : 'warning'
    result.title = `Unusual losing streak — ${currentStreak} in a row`
    result.message = `You're on a ${currentStreak}-bet losing streak. Historically, your streaks rarely exceed ${p90Streak} (90th percentile). This may be variance, but consider reducing stakes until the pattern breaks.`
    result.metadata = {
      current_streak: currentStreak,
      historical_p90: p90Streak,
      historical_avg: streaks.reduce((a, b) => a + b, 0) / streaks.length,
    }
  }

  return result
}
