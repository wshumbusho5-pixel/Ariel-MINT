import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend } from '@/lib/resend'
import { weeklyDigestHtml, weeklyDigestSubject } from '@/lib/email/weeklyDigest'

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const weeklyDigest = inngest.createFunction(
  { id: 'weekly-digest', name: 'Weekly Betting Digest' },
  { cron: '0 8 * * 1' },  // 8am UTC every Monday
  async ({ step }) => {
    const result = await step.run('send-digests', async () => {
      const supabase = createServiceClient()
      const resend = getResend()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ariel-mint.vercel.app'

      // Week window: last 7 days (Mon–Sun)
      const now = new Date()
      const weekEnd = new Date(now)
      weekEnd.setHours(0, 0, 0, 0)
      const weekStart = new Date(weekEnd.getTime() - 7 * 86400000)
      const weekLabel = `${fmtDate(weekStart)} – ${fmtDate(new Date(weekEnd.getTime() - 1))}, ${weekEnd.getFullYear()}`

      // Load all users opted in with an email, active or trial
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, weekly_digest')
        .eq('weekly_digest', true)

      if (!profiles || profiles.length === 0) return { sent: 0 }

      // Get emails from auth.users
      const userIds = profiles.map(p => p.id)
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const emailMap: Record<string, string> = {}
      for (const u of users ?? []) {
        if (u.email && userIds.includes(u.id)) emailMap[u.id] = u.email
      }

      let sent = 0

      await Promise.all(
        profiles.map(async (profile) => {
          const email = emailMap[profile.id]
          if (!email) return

          // Last 7 days settled bets
          const { data: bets } = await supabase
            .from('bets')
            .select('selection, odds, stake, profit_loss, status, placed_at')
            .eq('user_id', profile.id)
            .is('deleted_at', null)
            .neq('status', 'pending')
            .neq('status', 'void')
            .gte('placed_at', weekStart.toISOString())
            .lt('placed_at', weekEnd.toISOString())

          const weekBets = bets ?? []
          if (weekBets.length === 0) return  // nothing to report

          const settled = weekBets.filter(b => ['won', 'lost', 'cashout', 'partial_cashout'].includes(b.status))
          const wins = settled.filter(b => b.status === 'won').length
          const totalPL = settled.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
          const totalStake = settled.reduce((s, b) => s + b.stake, 0)
          const roi = totalStake > 0 ? Math.round((totalPL / totalStake) * 10000) / 100 : 0
          const winRate = settled.length > 0 ? Math.round((wins / settled.length) * 1000) / 10 : 0

          const sorted = [...settled].sort((a, b) => (b.profit_loss ?? 0) - (a.profit_loss ?? 0))
          const bestBet = sorted[0]
            ? { selection: sorted[0].selection, odds: sorted[0].odds, pl: sorted[0].profit_loss ?? 0 }
            : null
          const worstBet = sorted[sorted.length - 1] && (sorted[sorted.length - 1].profit_loss ?? 0) < 0
            ? { selection: sorted[sorted.length - 1].selection, odds: sorted[sorted.length - 1].odds, pl: sorted[sorted.length - 1].profit_loss ?? 0 }
            : null

          // Current streak from all-time bets
          const { data: allSettled } = await supabase
            .from('bets')
            .select('status, placed_at')
            .eq('user_id', profile.id)
            .is('deleted_at', null)
            .in('status', ['won', 'lost'])
            .order('placed_at', { ascending: false })
            .limit(20)

          let streak = 0
          if (allSettled && allSettled.length > 0) {
            const lastIsWin = allSettled[0].status === 'won'
            for (const b of allSettled) {
              if ((b.status === 'won') === lastIsWin) streak++
              else break
            }
            if (!lastIsWin) streak = -streak
          }

          try {
            await resend.emails.send({
              from: process.env.RESEND_FROM ?? 'Ariel MINT <digest@ariel-mint.com>',
              to: email,
              subject: weeklyDigestSubject(weekLabel),
              html: weeklyDigestHtml({
                username: profile.username,
                weekLabel,
                totalBets: weekBets.length,
                netPL: Math.round(totalPL * 100) / 100,
                roi,
                winRate,
                bestBet,
                worstBet,
                currentStreak: streak,
                appUrl,
              }),
            })
            sent++
          } catch {
            // Don't let one failed email stop others
          }
        })
      )

      return { sent }
    })

    return result
  }
)
