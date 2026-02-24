import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Monthly Trend Degradation: ROI declining month-over-month
 */
export function monthlyTrend(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'monthly_trend_degradation',
    severity: 'info',
    title: '',
    message: '',
    metadata: {},
  }

  const settled = ctx.bets.filter(b => ['won','lost','cashout','partial_cashout'].includes(b.status))
  if (settled.length < 20) return result

  // Group bets by month
  const byMonth: Record<string, { pl: number; stake: number }> = {}
  for (const bet of settled) {
    const month = bet.placed_at.slice(0, 7) // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { pl: 0, stake: 0 }
    byMonth[month].pl += bet.profit_loss ?? 0
    byMonth[month].stake += bet.stake
  }

  const months = Object.keys(byMonth).sort()
  if (months.length < 2) return result

  const monthlyROIs = months.map(m => ({
    month: m,
    roi: byMonth[m].stake > 0 ? (byMonth[m].pl / byMonth[m].stake) * 100 : 0,
    pl: byMonth[m].pl,
  }))

  const currentMonth = monthlyROIs[monthlyROIs.length - 1]
  const prev3 = monthlyROIs.slice(-4, -1)

  if (prev3.length < 1) return result

  const avgPrevROI = prev3.reduce((s, m) => s + m.roi, 0) / prev3.length
  const roiDrop = avgPrevROI - currentMonth.roi

  // Trigger if current month is significantly worse than 3-month average
  if (roiDrop > 15 && prev3.length >= 2) {
    result.triggered = true
    result.title = 'Your performance is trending downward this month'
    result.message = `This month's ROI is ${currentMonth.roi.toFixed(1)}% vs your ${prev3.length}-month average of ${avgPrevROI.toFixed(1)}%. A ${roiDrop.toFixed(1)}% drop suggests something has changed — market conditions, selection process, or discipline. Time to review.`
    result.metadata = {
      current_month: currentMonth.month,
      current_roi_pct: currentMonth.roi,
      previous_avg_roi_pct: avgPrevROI,
      drop_pct: roiDrop,
      months_compared: prev3.map(m => m.month),
    }
  }

  return result
}
