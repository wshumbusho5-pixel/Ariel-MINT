import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Correlation Risk: Multiple pending bets on the same event or team
 */
export function correlationRisk(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'correlation_risk',
    severity: 'warning',
    title: '',
    message: '',
    metadata: {},
  }

  const pendingBets = ctx.recentBets.filter(b => b.status === 'pending')
  if (pendingBets.length < 2) return result

  // Check for bets on same event
  const eventGroups: Record<string, string[]> = {}
  for (const bet of pendingBets) {
    const key = bet.event_name.toLowerCase().trim()
    if (!eventGroups[key]) eventGroups[key] = []
    eventGroups[key].push(bet.id)
  }

  const correlated = Object.entries(eventGroups).filter(([, ids]) => ids.length >= 2)

  if (correlated.length > 0) {
    const eventNames = correlated.map(([name]) => name)
    result.triggered = true
    result.title = 'Multiple bets on the same event'
    result.message = `You have multiple pending bets on: "${eventNames[0]}". Correlated bets don't diversify risk — they amplify it. A single outcome affects multiple bets simultaneously.`
    result.metadata = {
      correlated_events: eventNames,
      correlated_count: correlated.reduce((s, [,ids]) => s + ids.length, 0),
    }
    return result
  }

  // Check for same selection/team appearing multiple times
  const selectionMap: Record<string, number> = {}
  for (const bet of pendingBets) {
    const words = bet.selection.toLowerCase().split(/\s+/)
    for (const word of words) {
      if (word.length > 3) {
        selectionMap[word] = (selectionMap[word] ?? 0) + 1
      }
    }
  }

  const overexposed = Object.entries(selectionMap)
    .filter(([, count]) => count >= 3)
    .map(([term]) => term)

  if (overexposed.length > 0) {
    result.triggered = true
    result.title = `Possible correlated exposure on "${overexposed[0]}"`
    result.message = `The team/player "${overexposed[0]}" appears in ${selectionMap[overexposed[0]]} of your pending bets. If this outcome goes wrong, multiple bets could lose simultaneously.`
    result.metadata = {
      overexposed_terms: overexposed,
      pending_bets: pendingBets.length,
    }
  }

  return result
}
