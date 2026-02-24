import type { RiskCheckResult, RiskContext } from '../types'

/**
 * Concentration Risk: Too much exposure on a single sport or bookmaker
 */
export function concentrationRisk(ctx: RiskContext): RiskCheckResult {
  const result: RiskCheckResult = {
    triggered: false,
    alert_type: 'concentration_risk',
    severity: 'warning',
    title: '',
    message: '',
    metadata: {},
  }

  const bets = ctx.bets
  if (bets.length < 10) return result

  const total = bets.length

  // Count by sport
  const sportCounts: Record<string, number> = {}
  const bookmakerCounts: Record<string, number> = {}

  for (const bet of bets) {
    sportCounts[bet.sport] = (sportCounts[bet.sport] ?? 0) + 1
    bookmakerCounts[bet.bookmaker] = (bookmakerCounts[bet.bookmaker] ?? 0) + 1
  }

  const dominantSport = Object.entries(sportCounts).sort(([,a], [,b]) => b - a)[0]
  const dominantBook = Object.entries(bookmakerCounts).sort(([,a], [,b]) => b - a)[0]

  const sportPct = dominantSport ? (dominantSport[1] / total) * 100 : 0
  const bookPct = dominantBook ? (dominantBook[1] / total) * 100 : 0

  if (sportPct > 60) {
    result.triggered = true
    result.title = `Heavy concentration in ${dominantSport[0]}`
    result.message = `${sportPct.toFixed(0)}% of your bets are in ${dominantSport[0]}. Heavy concentration in one sport exposes you to correlated variance. Consider diversifying across sports.`
    result.metadata = { dominant_sport: dominantSport[0], sport_pct: sportPct, bookmaker_pct: bookPct }
    return result
  }

  if (bookPct > 60) {
    result.triggered = true
    result.title = `Over-reliance on ${dominantBook[0]}`
    result.message = `${bookPct.toFixed(0)}% of your bets are with ${dominantBook[0]}. Diversifying bookmakers gives you access to better odds and protects against account restrictions.`
    result.metadata = { dominant_bookmaker: dominantBook[0], bookmaker_pct: bookPct, sport_pct: sportPct }
    return result
  }

  return result
}
