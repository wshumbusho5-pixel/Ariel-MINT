import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Users, MessageCircle, TrendingUp, Award } from 'lucide-react'

export default async function AdvisorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Load all active public advisors
  const { data: advisors } = await supabase
    .from('profiles')
    .select('id, username, display_name, tier, advisor_specialty, advisor_fee, advisor_since, advisor_status')
    .eq('advisor_status', 'active')
    .eq('is_public', true)
    .order('advisor_since', { ascending: false })

  // For each advisor, calculate 90-day stats
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()

  const advisorStats = await Promise.all(
    (advisors ?? []).map(async (advisor) => {
      const { data: bets } = await supabase
        .from('bets')
        .select('profit_loss, stake, status, ocr_source_url')
        .eq('user_id', advisor.id)
        .is('deleted_at', null)
        .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])
        .gte('placed_at', ninetyDaysAgo)

      // All-time verified % (separate query)
      const { data: allBets } = await supabase
        .from('bets')
        .select('ocr_source_url')
        .eq('user_id', advisor.id)
        .is('deleted_at', null)

      const settled = bets ?? []
      const won = settled.filter(b => b.status === 'won').length
      const totalPL = settled.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
      const totalStake = settled.reduce((s, b) => s + b.stake, 0)
      const roi = totalStake > 0 ? (totalPL / totalStake) * 100 : 0
      const winRate = settled.length > 0 ? (won / settled.length) * 100 : 0

      const all = allBets ?? []
      const verifiedCount = all.filter(b => b.ocr_source_url).length
      const verifiedPct = all.length > 0 ? Math.round(verifiedCount / all.length * 1000) / 10 : 0

      return {
        ...advisor,
        roi90: Math.round(roi * 10) / 10,
        winRate90: Math.round(winRate * 10) / 10,
        betCount90: settled.length,
        verifiedPct,
      }
    })
  )

  // Sort by ROI descending
  advisorStats.sort((a, b) => b.roi90 - a.roi90)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Award className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Advisor Directory</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Verified bettors with proven track records. Stats are live from their actual betting history.
          </p>
        </div>
      </div>

      {advisorStats.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No advisors yet.</p>
            <p className="text-slate-500 text-sm mt-1">
              Advisors are bettors with 100+ settled bets, positive 90-day ROI, and a verified track record.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {advisorStats.map((advisor) => {
            const advisorSince = advisor.advisor_since
              ? new Date(advisor.advisor_since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
              : null

            return (
              <Card key={advisor.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {/* Name + badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">@{advisor.username}</span>
                        {advisor.display_name && (
                          <span className="text-slate-400 text-sm">{advisor.display_name}</span>
                        )}
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                          ✓ Verified Advisor
                        </Badge>
                        <span className="text-slate-500 text-xs capitalize">{advisor.tier}</span>
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        <span className={`font-medium ${advisor.roi90 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ROI (90d): {advisor.roi90 >= 0 ? '+' : ''}{advisor.roi90}%
                        </span>
                        <span className="text-slate-400">
                          Win Rate: {advisor.winRate90}%
                        </span>
                        <span className="text-slate-400">
                          Bets: {advisor.betCount90}
                        </span>
                        <span className="text-emerald-400/80">
                          {advisor.verifiedPct}% verified
                        </span>
                      </div>

                      {/* Specialty + fee */}
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                        {advisor.advisor_specialty && (
                          <span><TrendingUp className="w-3 h-3 inline mr-1" />{advisor.advisor_specialty}</span>
                        )}
                        {advisor.advisor_fee && (
                          <span>Fee: {advisor.advisor_fee}</span>
                        )}
                        {advisorSince && (
                          <span>Advisor since {advisorSince}</span>
                        )}
                      </div>
                    </div>

                    {/* Message button */}
                    {advisor.id !== user.id && (
                      <Link
                        href={`/messages?new=${advisor.id}`}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-600 text-center">
        Advisor status is automatically maintained. A sustained negative ROI results in removal from this directory.
      </p>
    </div>
  )
}
