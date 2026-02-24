import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'

export const checkWithdrawalTargets = inngest.createFunction(
  { id: 'check-withdrawal-targets', name: 'Check Withdrawal Targets' },
  { event: 'withdrawal/check.requested' },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string }

    await step.run('check-targets', async () => {
      const supabase = createServiceClient()

      const [profileRes, targetsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('current_bankroll, starting_bankroll')
          .eq('id', userId)
          .single(),
        supabase
          .from('withdrawal_targets')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .is('fulfilled_at', null),
      ])

      const profile = profileRes.data
      const targets = targetsRes.data ?? []

      if (!profile || targets.length === 0) return

      const currentProfit = profile.current_bankroll - profile.starting_bankroll

      for (const target of targets) {
        let triggered = false

        if (target.target_type === 'fixed_profit' && target.target_amount) {
          triggered = currentProfit >= target.target_amount && !target.triggered_at
        }

        if (triggered) {
          // Mark as triggered
          await supabase
            .from('withdrawal_targets')
            .update({ triggered_at: new Date().toISOString() })
            .eq('id', target.id)

          // Create a risk alert for the withdrawal reminder
          await supabase.from('risk_alerts').insert({
            user_id: userId,
            alert_type: 'ev_variance_mismatch',  // reusing as info alert
            severity: 'info',
            title: '💰 Withdrawal target reached!',
            message: `You've reached your profit target${target.description ? ` (${target.description})` : ''}. Consider withdrawing some profits to lock in your gains.`,
            metadata: {
              target_id: target.id,
              target_type: target.target_type,
              current_profit: currentProfit,
              target_amount: target.target_amount,
              type: 'withdrawal_reminder',
            },
          })
        }
      }
    })

    return { checked: true }
  }
)
