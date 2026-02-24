import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Drawdown Alert: Bankroll significantly below peak
 */
export function drawdownAlert(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'drawdown_alert',
    severity: 'warning',
    title: '',
    message: '',
    metadata: {},
  }

  if (ctx.peakBankroll <= 0) return result

  const drawdown = (ctx.peakBankroll - ctx.currentBankroll) / ctx.peakBankroll
  const drawdownPct = drawdown * 100

  if (drawdownPct < 15) return result

  result.triggered = true
  result.severity = drawdownPct >= 30 ? 'critical' : drawdownPct >= 20 ? 'warning' : 'info'

  const lost = ctx.peakBankroll - ctx.currentBankroll

  if (drawdownPct >= 30) {
    result.title = `Critical drawdown — ${drawdownPct.toFixed(1)}% below peak`
    result.message = `Your bankroll is down ${drawdownPct.toFixed(1)}% from its peak (${formatMoney(lost)} lost). This is a severe drawdown. Strongly consider stopping, reviewing your strategy, and restarting with reduced stakes.`
  } else if (drawdownPct >= 20) {
    result.title = `Significant drawdown — ${drawdownPct.toFixed(1)}% below peak`
    result.message = `You're ${drawdownPct.toFixed(1)}% below your peak bankroll (${formatMoney(lost)} down). Consider reducing your stake size or taking a short break to review performance.`
  } else {
    result.title = `Drawdown warning — ${drawdownPct.toFixed(1)}% below peak`
    result.message = `Your bankroll has dropped ${drawdownPct.toFixed(1)}% from its high point. Keep an eye on this and avoid increasing stakes to chase recovery.`
  }

  result.metadata = {
    current_bankroll: ctx.currentBankroll,
    peak_bankroll: ctx.peakBankroll,
    drawdown_pct: drawdownPct,
    drawdown_amount: lost,
  }

  return result
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
