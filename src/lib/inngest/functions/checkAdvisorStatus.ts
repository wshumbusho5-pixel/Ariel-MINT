import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'

export const checkAdvisorStatus = inngest.createFunction(
  { id: 'check-advisor-status', name: 'Check Advisor Performance Status' },
  { cron: '0 2 * * *' }, // 2am UTC daily
  async ({ step }) => {
    const result = await step.run('check-all-advisors', async () => {
      const supabase = createServiceClient()
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()
      const now = new Date().toISOString()

      // Load all active/flagged advisors
      const { data: advisors } = await supabase
        .from('profiles')
        .select('id, advisor_status, advisor_flagged_at')
        .in('advisor_status', ['active', 'flagged'])

      if (!advisors || advisors.length === 0) return { checked: 0, flagged: 0, suspended: 0, recovered: 0 }

      let flagged = 0, suspended = 0, recovered = 0

      for (const advisor of advisors) {
        // Calculate 60-day rolling ROI
        const { data: bets } = await supabase
          .from('bets')
          .select('profit_loss, stake')
          .eq('user_id', advisor.id)
          .is('deleted_at', null)
          .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])
          .gte('placed_at', sixtyDaysAgo)

        const totalPL = (bets ?? []).reduce((s, b) => s + (b.profit_loss ?? 0), 0)
        const totalStake = (bets ?? []).reduce((s, b) => s + b.stake, 0)
        const roi60 = totalStake > 0 ? totalPL / totalStake : 0

        if (advisor.advisor_status === 'active' && roi60 < 0) {
          // Flag the advisor
          await supabase.from('profiles').update({
            advisor_status: 'flagged',
            advisor_flagged_at: now,
            advisor_flag_reason: 'ROI negative over last 60 days',
          }).eq('id', advisor.id)
          flagged++
        } else if (advisor.advisor_status === 'flagged') {
          if (roi60 >= 0) {
            // ROI recovered — reinstate
            await supabase.from('profiles').update({
              advisor_status: 'active',
              advisor_flagged_at: null,
              advisor_flag_reason: null,
            }).eq('id', advisor.id)
            recovered++
          } else if (advisor.advisor_flagged_at) {
            // Still negative — check if 30+ days since flagged
            const daysSinceFlagged = Math.floor(
              (Date.now() - new Date(advisor.advisor_flagged_at).getTime()) / 86400000
            )
            if (daysSinceFlagged >= 30) {
              await supabase.from('profiles').update({
                advisor_status: 'suspended',
                advisor_flag_reason: 'ROI negative for 30+ days — advisor status suspended',
              }).eq('id', advisor.id)
              suspended++
            }
          }
        }
      }

      return { checked: advisors.length, flagged, suspended, recovered }
    })

    return result
  }
)
