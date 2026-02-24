import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Odds Bias: Betting at ranges where actual win rate is below implied probability
 */
export function oddsBias(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'odds_bias',
    severity: 'info',
    title: '',
    message: '',
    metadata: {},
  }

  const settled = ctx.bets.filter(b => ['won','lost'].includes(b.status))
  if (settled.length < 30) return result

  // Group by odds buckets
  const buckets: Record<string, { won: number; total: number; impliedProb: number }> = {
    'heavy-fav': { won: 0, total: 0, impliedProb: 75 },  // odds 1.01–1.40
    'favourite':  { won: 0, total: 0, impliedProb: 55 },  // odds 1.40–1.80
    'near-evens': { won: 0, total: 0, impliedProb: 44 },  // odds 1.80–2.20
    'outsider':   { won: 0, total: 0, impliedProb: 33 },  // odds 2.20–3.00
    'longshot':   { won: 0, total: 0, impliedProb: 20 },  // odds 3.00+
  }

  for (const bet of settled) {
    let bucket: string
    if (bet.odds < 1.40) { bucket = 'heavy-fav'; buckets[bucket].impliedProb = (1 / bet.odds) * 100 }
    else if (bet.odds < 1.80) bucket = 'favourite'
    else if (bet.odds < 2.20) bucket = 'near-evens'
    else if (bet.odds < 3.00) bucket = 'outsider'
    else bucket = 'longshot'

    buckets[bucket].total++
    if (bet.status === 'won') buckets[bucket].won++
  }

  // Find the bucket with worst performance vs implied probability
  const problems: string[] = []
  let worstBucket = ''
  let worstGap = 0

  for (const [name, data] of Object.entries(buckets)) {
    if (data.total < 8) continue
    const actualProb = (data.won / data.total) * 100
    const gap = data.impliedProb - actualProb

    if (gap > 15 && data.total >= 10) {
      const label = { 'heavy-fav': 'heavy favourites', 'favourite': 'favourites', 'near-evens': 'near-evens', 'outsider': 'outsiders', 'longshot': 'longshots' }[name]
      problems.push(`${label ?? name} (implied ${data.impliedProb.toFixed(0)}% → actual ${actualProb.toFixed(0)}%)`)
      if (gap > worstGap) { worstGap = gap; worstBucket = name }
    }
  }

  if (problems.length > 0 && worstBucket) {
    result.triggered = true
    result.title = 'You may be systematically overestimating certain odds'
    result.message = `Your actual win rate is significantly below implied probability for: ${problems.join(', ')}. This suggests you may be overconfident in these selections. Review your approach in these odds ranges.`
    result.metadata = {
      problem_buckets: problems,
      worst_bucket: worstBucket,
      worst_gap_pct: worstGap,
      bucket_breakdown: Object.fromEntries(
        Object.entries(buckets).filter(([, v]) => v.total > 0).map(([k, v]) => [
          k, { total: v.total, win_rate_pct: v.total > 0 ? (v.won / v.total * 100).toFixed(1) : 0, implied_pct: v.impliedProb }
        ])
      ),
    }
  }

  return result
}
