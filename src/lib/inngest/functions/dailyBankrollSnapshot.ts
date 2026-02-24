import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'

export const dailyBankrollSnapshot = inngest.createFunction(
  { id: 'daily-bankroll-snapshot', name: 'Daily Bankroll Snapshot' },
  { cron: '0 0 * * *' },  // Midnight UTC daily
  async ({ step }) => {
    await step.run('snapshot-all-users', async () => {
      const supabase = createServiceClient()
      const today = new Date().toISOString().slice(0, 10)

      // Load all users with bankroll data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, current_bankroll')

      if (!profiles || profiles.length === 0) return

      // For each user, calculate today's P&L and cumulative P&L
      const snapshots = await Promise.all(
        profiles.map(async (profile: { id: string; current_bankroll: number | null }) => {
          const startOfDay = `${today}T00:00:00.000Z`
          const endOfDay = `${today}T23:59:59.999Z`

          const { data: todayBets } = await supabase
            .from('bets')
            .select('profit_loss, stake')
            .eq('user_id', profile.id)
            .is('deleted_at', null)
            .gte('settled_at', startOfDay)
            .lte('settled_at', endOfDay)
            .not('status', 'eq', 'pending')

          const dailyPL = (todayBets ?? []).reduce((s: number, b: { profit_loss: number | null; stake: number | null }) => s + (b.profit_loss ?? 0), 0)
          const betsCount = todayBets?.length ?? 0

          // Get cumulative P&L (current_bankroll - starting_bankroll handled in DB)
          return {
            user_id: profile.id,
            snapshot_date: today,
            bankroll: profile.current_bankroll,
            daily_pl: dailyPL,
            cumulative_pl: 0,  // computed from profile later
            bets_count: betsCount,
          }
        })
      )

      // Upsert snapshots
      await supabase
        .from('bankroll_snapshots')
        .upsert(snapshots, { onConflict: 'user_id,snapshot_date' })
    })

    return { success: true }
  }
)
