import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Deterministic anonymous alias from user ID
 * Same user gets different alias each month (prevents cross-month tracking)
 */
function generateAlias(userId: string, monthStr: string): string {
  const adjectives = ['Sharp','Bold','Smart','Edge','Clean','Value','Quick','Steady','Cool','Deep']
  const nouns = ['Bettor','Punter','Capper','Trader','Analyst','Edge','Scout','Shark','Pro','Hunter']

  // Simple deterministic hash from userId + month
  let hash = 0
  const seed = userId + monthStr
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash = hash & hash
  }
  const h = Math.abs(hash)
  const adj = adjectives[h % adjectives.length]
  const noun = nouns[Math.floor(h / 10) % nouns.length]
  const num = (h % 9000) + 1000

  return `${adj}${noun}_${num}`
}

export const monthlyLeaderboard = inngest.createFunction(
  { id: 'monthly-leaderboard', name: 'Monthly Leaderboard Snapshot' },
  { cron: '0 1 1 * *' },  // 1am UTC on the 1st of each month
  async ({ step }) => {
    const snapshotMonth = await step.run('compute-leaderboard', async () => {
      const supabase = createServiceClient()

      // Previous month
      const now = new Date()
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const monthStr = prevMonth.toISOString().slice(0, 7)  // "YYYY-MM"
      const monthStart = `${monthStr}-01T00:00:00.000Z`
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = nextMonthDate.toISOString()

      // Load all public users
      const { data: publicProfiles } = await supabase
        .from('profiles')
        .select('id, tier')
        .eq('is_public', true)

      if (!publicProfiles || publicProfiles.length === 0) return monthStr

      const snapshots = await Promise.all(
        publicProfiles.map(async profile => {
          const { data: bets } = await supabase
            .from('bets')
            .select('profit_loss, stake, status')
            .eq('user_id', profile.id)
            .is('deleted_at', null)
            .gte('placed_at', monthStart)
            .lt('placed_at', monthEnd)
            .neq('status', 'pending')

          if (!bets || bets.length === 0) return null

          const settled = bets.filter(b => ['won','lost'].includes(b.status))
          const won = settled.filter(b => b.status === 'won')
          const totalPL = bets.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
          const totalStake = bets.reduce((s, b) => s + b.stake, 0)
          const roiPct = totalStake > 0 ? (totalPL / totalStake) * 100 : 0
          const winRate = settled.length > 0 ? (won.length / settled.length) * 100 : 0

          return {
            user_id: profile.id,
            snapshot_month: `${monthStr}-01`,
            display_alias: generateAlias(profile.id, monthStr),
            tier: profile.tier,
            monthly_roi_pct: Math.round(roiPct * 100) / 100,
            monthly_pl: Math.round(totalPL * 100) / 100,
            total_bets: bets.length,
            win_rate_pct: Math.round(winRate * 100) / 100,
            discipline_score: 70 + Math.random() * 30,  // TODO: real discipline scoring in Phase 6
          }
        })
      )

      const validSnapshots = snapshots.filter(Boolean)
      if (validSnapshots.length > 0) {
        await supabase
          .from('leaderboard_snapshots')
          .upsert(validSnapshots, { onConflict: 'user_id,snapshot_month' })
      }

      return monthStr
    })

    return { success: true, month: snapshotMonth }
  }
)
