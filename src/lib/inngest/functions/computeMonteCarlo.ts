import { inngest } from '../client'
import { runMonteCarlo } from '@/lib/analytics/monteCarlo'
import { createServiceClient } from '@/lib/supabase/server'

const PROJECTION_HORIZONS = [30, 60, 90] as const

export const computeMonteCarlo = inngest.createFunction(
  { id: 'compute-monte-carlo', name: 'Compute Monte Carlo Projections' },
  { event: 'montecarlo/compute.requested' },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string }

    // Step 1: Load bet history for input parameters
    const params = await step.run('compute-params', async () => {
      const supabase = createServiceClient()

      const [profileRes, betsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('current_bankroll')
          .eq('id', userId)
          .single(),
        supabase
          .from('bets')
          .select('odds, stake, status, profit_loss, placed_at')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .neq('status', 'pending')
          .order('placed_at', { ascending: false })
          .limit(500),
      ])

      type BetRow = { odds: number; stake: number; status: string; profit_loss: number | null; placed_at: string | null }
      const bets: BetRow[] = betsRes.data ?? []
      const settled = bets.filter(b => ['won','lost'].includes(b.status))

      if (settled.length < 10) return null

      const won = settled.filter(b => b.status === 'won')
      const winRate = won.length / settled.length
      const avgOdds = settled.reduce((s, b) => s + b.odds, 0) / settled.length
      const currentBankroll = profileRes.data?.current_bankroll ?? 0

      if (currentBankroll <= 0) return null

      // Calculate avg stake as % of average bankroll (approximate)
      const avgStake = settled.reduce((s, b) => s + b.stake, 0) / settled.length
      const avgStakePct = Math.min(avgStake / currentBankroll, 0.5)  // cap at 50%

      // Estimate bets per day from date range
      if (bets.length < 2) return null
      const oldest = new Date(bets[bets.length - 1].placed_at ?? Date.now())
      const newest = new Date(bets[0].placed_at ?? Date.now())
      const daysDiff = Math.max(1, (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24))
      const avgBetsPerDay = Math.max(0.1, bets.length / daysDiff)

      return { currentBankroll, winRate, avgOdds, avgStakePct, avgBetsPerDay }
    })

    if (!params) return { skipped: true, reason: 'Insufficient bet history' }

    // Step 2: Run simulations for each horizon (in parallel-ish via steps)
    await step.run('run-simulations', async () => {
      const supabase = createServiceClient()

      const results = PROJECTION_HORIZONS.map(days =>
        runMonteCarlo({ ...params, projectionDays: days, numSimulations: 10000 })
      )

      // Invalidate old results
      await supabase
        .from('monte_carlo_results')
        .update({ invalidated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('invalidated_at', null)

      // Insert new results for each horizon
      await supabase.from('monte_carlo_results').insert(
        PROJECTION_HORIZONS.map((days, i) => ({
          user_id: userId,
          projection_days: days,
          num_simulations: 10000,
          percentile_5: results[i].percentile5,
          percentile_25: results[i].percentile25,
          percentile_50: results[i].percentile50,
          percentile_75: results[i].percentile75,
          percentile_95: results[i].percentile95,
          ruin_probability: results[i].ruinProbability,
          breakeven_days: results[i].breakevenDays,
          expected_value: results[i].expectedValue,
          max_drawdown_simulated: results[i].maxDrawdownSimulated,
          loss_streak_90th_pct: results[i].lossStreak90thPct,
        }))
      )
    })

    return { computed: true, horizons: PROJECTION_HORIZONS }
  }
)
