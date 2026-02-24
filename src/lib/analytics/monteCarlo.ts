/**
 * Monte Carlo Bankroll Projection Engine
 * Simulates thousands of future betting scenarios based on historical performance
 */

export interface MonteCarloInput {
  currentBankroll: number
  winRate: number          // 0.0 – 1.0
  avgOdds: number          // decimal
  avgStakePct: number      // fraction of bankroll per bet (e.g. 0.02 = 2%)
  avgBetsPerDay: number
  projectionDays: number
  numSimulations?: number
}

export interface MonteCarloOutput {
  percentile5: number[]
  percentile25: number[]
  percentile50: number[]
  percentile75: number[]
  percentile95: number[]
  ruinProbability: number  // fraction of runs that hit near 0
  breakevenDays: number | null
  expectedValue: number
  maxDrawdownSimulated: number
  lossStreak90thPct: number
}

/**
 * Fast seeded random using xorshift32
 * About 10x faster than Math.random() for tight loops
 */
function makeRng(seed: number) {
  let s = seed | 0
  return function () {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

/**
 * Sample from Poisson distribution (for bets-per-day)
 */
function poissonSample(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

/**
 * Run Monte Carlo simulation
 * Returns percentile arrays (one value per day) and derived metrics
 */
export function runMonteCarlo(input: MonteCarloInput): MonteCarloOutput {
  const {
    currentBankroll,
    winRate,
    avgOdds,
    avgStakePct,
    avgBetsPerDay,
    projectionDays,
    numSimulations = 5000,  // lower default for serverless; override to 10000 for background jobs
  } = input

  const days = projectionDays
  // Pre-allocate typed arrays for performance
  // dayValues[day][sim] — transposed for percentile calculation
  const dayValues: Float64Array[] = Array.from({ length: days + 1 }, () => new Float64Array(numSimulations))

  let ruinCount = 0
  const allLossStreaks: number[] = []
  const finalValues: number[] = []

  for (let sim = 0; sim < numSimulations; sim++) {
    const rng = makeRng(sim * 2654435761 + 1)  // deterministic seed per simulation
    let bankroll = currentBankroll
    dayValues[0][sim] = bankroll

    let lossStreak = 0
    let maxLossStreak = 0
    let peakBankroll = bankroll
    let maxDrawdown = 0

    for (let day = 1; day <= days; day++) {
      const betsToday = Math.max(0, poissonSample(avgBetsPerDay, rng))

      for (let b = 0; b < betsToday; b++) {
        if (bankroll < 0.01) break
        const stake = bankroll * avgStakePct
        const won = rng() < winRate

        if (won) {
          bankroll += stake * (avgOdds - 1)
          lossStreak = 0
        } else {
          bankroll -= stake
          lossStreak++
          if (lossStreak > maxLossStreak) maxLossStreak = lossStreak
        }

        // Track drawdown
        if (bankroll > peakBankroll) peakBankroll = bankroll
        const drawdown = peakBankroll > 0 ? (peakBankroll - bankroll) / peakBankroll : 0
        if (drawdown > maxDrawdown) maxDrawdown = drawdown

        bankroll = Math.max(0, bankroll)
      }

      dayValues[day][sim] = bankroll
    }

    allLossStreaks.push(maxLossStreak)
    finalValues.push(bankroll)
    if (bankroll < currentBankroll * 0.05) ruinCount++
  }

  // Calculate percentile arrays for each day
  const percentile5 = new Array(days + 1)
  const percentile25 = new Array(days + 1)
  const percentile50 = new Array(days + 1)
  const percentile75 = new Array(days + 1)
  const percentile95 = new Array(days + 1)

  for (let day = 0; day <= days; day++) {
    const sorted = Array.from(dayValues[day]).sort((a, b) => a - b)
    percentile5[day] = round2(sorted[Math.floor(numSimulations * 0.05)])
    percentile25[day] = round2(sorted[Math.floor(numSimulations * 0.25)])
    percentile50[day] = round2(sorted[Math.floor(numSimulations * 0.50)])
    percentile75[day] = round2(sorted[Math.floor(numSimulations * 0.75)])
    percentile95[day] = round2(sorted[Math.floor(numSimulations * 0.95)])
  }

  // Breakeven days: first day where median (p50) >= starting bankroll
  let breakevenDays: number | null = null
  for (let day = 0; day <= days; day++) {
    if (percentile50[day] >= currentBankroll) {
      breakevenDays = day
      break
    }
  }

  // 90th percentile loss streak
  allLossStreaks.sort((a, b) => a - b)
  const lossStreak90thPct = allLossStreaks[Math.floor(numSimulations * 0.90)] ?? 0

  // Max drawdown: average of worst 10% of simulations
  const maxDrawdownSorted = finalValues
    .map((v, i) => (currentBankroll - v) / currentBankroll)
    .sort((a, b) => b - a)
  const maxDrawdownSimulated = maxDrawdownSorted.slice(0, Math.floor(numSimulations * 0.1))
    .reduce((a, b) => a + b, 0) / Math.floor(numSimulations * 0.1)

  return {
    percentile5,
    percentile25,
    percentile50,
    percentile75,
    percentile95,
    ruinProbability: ruinCount / numSimulations,
    breakevenDays,
    expectedValue: round2(finalValues.reduce((a, b) => a + b, 0) / numSimulations),
    maxDrawdownSimulated: round2(maxDrawdownSimulated * 100),
    lossStreak90thPct,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
