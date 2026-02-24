import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Late Night Betting: Performance measurably worse during late hours
 */
export function lateNightBetting(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'late_night_betting',
    severity: 'info',
    title: '',
    message: '',
    metadata: {},
  }

  const settled = ctx.bets.filter(b => ['won','lost'].includes(b.status) && b.placed_at)
  if (settled.length < 20) return result

  // Convert to user timezone and split into late-night vs normal
  const lateHours = new Set([23, 0, 1, 2, 3, 4])

  const lateBets = settled.filter(b => {
    const hour = new Date(b.placed_at).toLocaleString('en-US', {
      hour: 'numeric', hour12: false, timeZone: ctx.timezone
    })
    return lateHours.has(parseInt(hour))
  })

  const normalBets = settled.filter(b => !lateBets.includes(b))

  if (lateBets.length < 5 || normalBets.length < 10) return result

  const lateWins = lateBets.filter(b => b.status === 'won').length
  const lateWinRate = lateWins / lateBets.length

  const normalWins = normalBets.filter(b => b.status === 'won').length
  const normalWinRate = normalWins / normalBets.length

  const lateROI = lateBets.reduce((s, b) => s + (b.profit_loss ?? 0), 0) /
    lateBets.reduce((s, b) => s + b.stake, 0) * 100
  const normalROI = normalBets.reduce((s, b) => s + (b.profit_loss ?? 0), 0) /
    normalBets.reduce((s, b) => s + b.stake, 0) * 100

  // Flag if late-night ROI is significantly worse
  const roiDrop = normalROI - lateROI

  if (roiDrop > 10 && lateBets.length >= 10) {
    result.triggered = true
    result.title = 'Late-night betting hurts your performance'
    result.message = `Your ROI during late hours (11pm–4am) is ${lateROI.toFixed(1)}% vs ${normalROI.toFixed(1)}% at other times — a ${roiDrop.toFixed(1)}% gap. Fatigue likely affects your judgement. Consider avoiding bets after 11pm.`
    result.metadata = {
      late_bets: lateBets.length,
      late_win_rate_pct: lateWinRate * 100,
      late_roi_pct: lateROI,
      normal_win_rate_pct: normalWinRate * 100,
      normal_roi_pct: normalROI,
      roi_difference: roiDrop,
    }
  }

  return result
}
