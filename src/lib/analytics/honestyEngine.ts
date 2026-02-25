/**
 * Honesty Engine
 * Separates skill from variance — tells the bettor the truth about their performance.
 */

// Cumulative standard normal distribution using Abramowitz & Stegun approximation
function normalCDF(z: number): number {
  if (z < -8) return 0
  if (z > 8) return 1
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const p = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly
  return z >= 0 ? p : 1 - p
}

export interface BetForHonesty {
  odds: number
  stake: number
  status: string        // 'won' | 'lost' | 'cashout' | 'partial_cashout' | 'void'
  profit_loss: number | null
  placed_at: string
}

export interface MonthlyPL {
  month: string         // "2025-01"
  monthLabel: string    // "January 2025"
  staked: number
  netPL: number
  roi: number
  winRate: number
  betCount: number
  settledCount: number
}

export interface HonestyMetrics {
  // Core honesty numbers
  actualWinRate: number         // actual wins / settled (0-1)
  expectedWinRate: number       // avg(1/odds) across settled bets (0-1)
  edge: number                  // actual - expected, in percentage points

  // Statistical confidence
  sampleSize: number            // settled bet count
  zScore: number
  pValue: number                // probability results are pure luck (lower = more skilled)
  skillConfidence: number       // (1 - pValue) * 100 — "87% confident this is skill"
  confidenceLevel: 'insufficient' | 'low' | 'moderate' | 'high'

  // Yield analysis
  actualYield: number           // total P&L / total staked * 100
  expectedYield: number         // what typical bookmaker margin produces (avg 1/odds - 1) * 100

  // Break-even
  breakEvenOdds: number         // minimum avg odds needed at your win rate to be profitable
  currentAvgOdds: number

  // Recent form vs overall
  last14DayROI: number
  last14DayBets: number
  overallROI: number
  recentFormDelta: number       // last14 - overall (negative = declining)
  restRecommended: boolean

  // Monthly P&L
  monthlyPL: MonthlyPL[]

  // Streak context
  currentStreak: number         // positive = win streak, negative = loss streak
  currentStreakProbability: number  // probability of this streak by chance (0-1)
}

export function computeHonesty(bets: BetForHonesty[]): HonestyMetrics {
  const settled = bets.filter(b => ['won', 'lost', 'cashout', 'partial_cashout'].includes(b.status))
  const wins = settled.filter(b => b.status === 'won').length
  const n = settled.length

  // Win rates
  const actualWinRate = n > 0 ? wins / n : 0
  const expectedWinRate = n > 0
    ? settled.reduce((sum, b) => sum + (b.odds > 1 ? 1 / b.odds : 0), 0) / n
    : 0
  const edge = (actualWinRate - expectedWinRate) * 100 // percentage points

  // Statistical significance (one-tailed binomial, normal approximation)
  const p = expectedWinRate
  const mean = n * p
  const stdDev = n > 0 ? Math.sqrt(n * p * (1 - p)) : 1
  const zScore = stdDev > 0 ? (wins - mean) / stdDev : 0
  const pValue = 1 - normalCDF(zScore)   // one-tailed: P(results this good by luck)
  const skillConfidence = Math.max(0, Math.min(100, (1 - pValue) * 100))

  const confidenceLevel: HonestyMetrics['confidenceLevel'] =
    n < 50 ? 'insufficient' :
    n < 150 ? 'low' :
    n < 300 ? 'moderate' : 'high'

  // Yield analysis
  const totalStake = settled.reduce((s, b) => s + b.stake, 0)
  const totalPL = settled.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const actualYield = totalStake > 0 ? (totalPL / totalStake) * 100 : 0

  // Expected yield (fair implied probability - 1, i.e. bookmaker margin)
  const avgImpliedProb = expectedWinRate
  const currentAvgOdds = n > 0
    ? settled.reduce((s, b) => s + b.odds, 0) / n
    : 0
  // At fair odds, expected yield is 0. With overround, it's negative.
  // Approximate: expected yield ≈ (1 - sum(1/odds)/n * avgOdds - 1) — simplified:
  const expectedYield = currentAvgOdds > 0 ? (avgImpliedProb * currentAvgOdds - 1) * 100 : 0

  // Break-even odds
  const breakEvenOdds = actualWinRate > 0 ? Math.round((1 / actualWinRate) * 100) / 100 : 0

  // Overall ROI
  const allSettledStake = bets.filter(b => b.status !== 'pending' && b.status !== 'void')
    .reduce((s, b) => s + b.stake, 0)
  const allSettledPL = bets.filter(b => b.status !== 'pending' && b.status !== 'void')
    .reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const overallROI = allSettledStake > 0 ? (allSettledPL / allSettledStake) * 100 : 0

  // Last 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000)
  const last14 = settled.filter(b => new Date(b.placed_at) >= fourteenDaysAgo)
  const last14Stake = last14.reduce((s, b) => s + b.stake, 0)
  const last14PL = last14.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const last14DayROI = last14Stake > 0 ? (last14PL / last14Stake) * 100 : 0
  const last14DayBets = last14.length
  const recentFormDelta = last14DayROI - overallROI

  // Rest recommended if: recent form has dropped significantly AND health is poor
  const restRecommended = last14DayBets >= 5 && recentFormDelta < -10

  // Current streak (using all bets sorted by time)
  const sortedSettled = [...settled].sort((a, b) =>
    new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime()
  )
  let streakCount = 0
  if (sortedSettled.length > 0) {
    const lastOutcome = sortedSettled[sortedSettled.length - 1].status === 'won'
    for (let i = sortedSettled.length - 1; i >= 0; i--) {
      const isWin = sortedSettled[i].status === 'won'
      if (isWin === lastOutcome) streakCount++
      else break
    }
    if (!lastOutcome) streakCount = -streakCount
  }

  // Probability of current streak by chance
  const streakLen = Math.abs(streakCount)
  const streakWinRate = streakCount > 0 ? actualWinRate : (1 - actualWinRate)
  const streakProbability = streakLen > 0 && streakWinRate > 0
    ? Math.pow(streakWinRate, streakLen)
    : 1

  // Monthly P&L
  const monthMap: Record<string, {
    staked: number; netPL: number; wins: number; settled: number; total: number
  }> = {}

  for (const bet of bets) {
    if (bet.status === 'pending' || bet.status === 'void') continue
    const d = new Date(bet.placed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthMap[key]) monthMap[key] = { staked: 0, netPL: 0, wins: 0, settled: 0, total: 0 }
    monthMap[key].staked += bet.stake
    monthMap[key].netPL += bet.profit_loss ?? 0
    monthMap[key].total++
    if (['won', 'lost', 'cashout', 'partial_cashout'].includes(bet.status)) {
      monthMap[key].settled++
      if (bet.status === 'won') monthMap[key].wins++
    }
  }

  const monthlyPL: MonthlyPL[] = Object.entries(monthMap)
    .sort(([a], [b]) => b.localeCompare(a))  // most recent first
    .map(([month, data]) => {
      const [year, mo] = month.split('-')
      const date = new Date(Number(year), Number(mo) - 1, 1)
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      return {
        month,
        monthLabel,
        staked: Math.round(data.staked * 100) / 100,
        netPL: Math.round(data.netPL * 100) / 100,
        roi: data.staked > 0 ? Math.round((data.netPL / data.staked) * 10000) / 100 : 0,
        winRate: data.settled > 0 ? Math.round((data.wins / data.settled) * 1000) / 10 : 0,
        betCount: data.total,
        settledCount: data.settled,
      }
    })

  return {
    actualWinRate: Math.round(actualWinRate * 10000) / 100,
    expectedWinRate: Math.round(expectedWinRate * 10000) / 100,
    edge: Math.round(edge * 100) / 100,
    sampleSize: n,
    zScore: Math.round(zScore * 100) / 100,
    pValue: Math.round(pValue * 10000) / 10000,
    skillConfidence: Math.round(skillConfidence * 10) / 10,
    confidenceLevel,
    actualYield: Math.round(actualYield * 100) / 100,
    expectedYield: Math.round(expectedYield * 100) / 100,
    breakEvenOdds,
    currentAvgOdds: Math.round(currentAvgOdds * 100) / 100,
    last14DayROI: Math.round(last14DayROI * 100) / 100,
    last14DayBets,
    overallROI: Math.round(overallROI * 100) / 100,
    recentFormDelta: Math.round(recentFormDelta * 100) / 100,
    restRecommended,
    monthlyPL,
    currentStreak: streakCount,
    currentStreakProbability: Math.round(streakProbability * 10000) / 10000,
  }
}
