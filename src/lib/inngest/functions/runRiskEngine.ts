import { inngest } from '../client'
import { runRiskChecks } from '@/lib/risk/engine'
import { createServiceClient } from '@/lib/supabase/server'
import type { AlertType } from '@/types/database'

export const runRiskEngine = inngest.createFunction(
  { id: 'run-risk-engine', name: 'Run Risk Engine' },
  { event: 'risk/check.requested' },
  async ({ event, step }) => {
    const { userId, betId } = event.data as { userId: string; betId?: string }

    // Step 1: Load all necessary data
    const data = await step.run('load-data', async () => {
      const supabase = createServiceClient()

      const thirtyMin = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const ninetyDays = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

      const [profileRes, betsRes, recentBetsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('current_bankroll, peak_bankroll, timezone')
          .eq('id', userId)
          .single(),
        supabase
          .from('bets')
          .select('id, sport, bookmaker, event_name, selection, odds, stake, status, profit_loss, placed_at, settled_at')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .gte('placed_at', ninetyDays)
          .order('placed_at', { ascending: false }),
        supabase
          .from('bets')
          .select('id, sport, bookmaker, event_name, selection, odds, stake, status, profit_loss, placed_at, settled_at')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .gte('placed_at', thirtyMin)
          .order('placed_at', { ascending: false }),
      ])

      return {
        profile: profileRes.data,
        bets: betsRes.data ?? [],
        recentBets: recentBetsRes.data ?? [],
      }
    })

    if (!data.profile) return { skipped: true, reason: 'Profile not found' }

    // Step 2: Run risk checks
    const triggeredAlerts = await step.run('run-checks', async () => {
      return runRiskChecks({
        userId,
        betId,
        bets: data.bets,
        recentBets: data.recentBets,
        currentBankroll: data.profile!.current_bankroll,
        peakBankroll: data.profile!.peak_bankroll,
        timezone: data.profile!.timezone ?? 'UTC',
      })
    })

    // Step 3: Persist triggered alerts (deduplicated within 24h)
    await step.run('save-alerts', async () => {
      if (triggeredAlerts.length === 0) return

      const supabase = createServiceClient()
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // Check existing undismissed alerts of the same type in last 24h
      const { data: existing } = await supabase
        .from('risk_alerts')
        .select('alert_type')
        .eq('user_id', userId)
        .is('dismissed_at', null)
        .gte('created_at', twentyFourHoursAgo)

      const existingTypes = new Set(existing?.map(a => a.alert_type) ?? [])

      const toInsert = triggeredAlerts
        .filter(a => !existingTypes.has(a.alert_type as AlertType))
        .map(a => ({
          user_id: userId,
          bet_id: betId ?? null,
          alert_type: a.alert_type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          metadata: a.metadata,
        }))

      if (toInsert.length > 0) {
        await supabase.from('risk_alerts').insert(toInsert)
      }
    })

    return { alerts_triggered: triggeredAlerts.length }
  }
)
