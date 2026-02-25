import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Award, TrendingUp, MessageCircle } from 'lucide-react'

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, tier, is_public, advisor_status, advisor_specialty, advisor_fee, advisor_since, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()
  if (!profile.is_public && profile.advisor_status !== 'active') notFound()

  // 90-day stats
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()
  const { data: bets } = await supabase
    .from('bets')
    .select('profit_loss, stake, status, sport, ocr_source_url')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])
    .gte('placed_at', ninetyDaysAgo)

  // All-time verified %
  const { data: allBets } = await supabase
    .from('bets')
    .select('ocr_source_url')
    .eq('user_id', profile.id)
    .is('deleted_at', null)

  const settled = bets ?? []
  const won = settled.filter(b => b.status === 'won').length
  const totalPL = settled.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const totalStake = settled.reduce((s, b) => s + b.stake, 0)
  const roi = totalStake > 0 ? (totalPL / totalStake) * 100 : 0
  const winRate = settled.length > 0 ? (won / settled.length) * 100 : 0

  // Top sport
  const sportCounts: Record<string, number> = {}
  for (const b of settled) {
    if (b.sport) sportCounts[b.sport] = (sportCounts[b.sport] ?? 0) + 1
  }
  const topSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const all = allBets ?? []
  const verifiedCount = all.filter(b => b.ocr_source_url).length
  const verifiedPct = all.length > 0 ? Math.round(verifiedCount / all.length * 1000) / 10 : 0

  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const advisorSince = profile.advisor_since
    ? new Date(profile.advisor_since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-2xl mx-auto mb-4">
            {profile.username[0].toUpperCase()}
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
            {profile.advisor_status === 'active' && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                ✓ Verified Advisor
              </Badge>
            )}
          </div>
          {profile.display_name && (
            <p className="text-slate-400 mt-1">{profile.display_name}</p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            <span className="capitalize">{profile.tier}</span> · Member since {memberSince}
          </p>
        </div>

        {/* Stats */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-4">Last 90 Days</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center mb-4">
              <div>
                <p className={`text-xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mt-0.5">ROI</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{winRate.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-0.5">Win Rate</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{settled.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Bets (90d)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center pt-4 border-t border-slate-800">
              <div>
                <p className="text-xl font-bold text-white capitalize">{topSport ?? '—'}</p>
                <p className="text-xs text-slate-500 mt-0.5">Top Sport</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-400">{verifiedPct}%</p>
                <p className="text-xs text-slate-500 mt-0.5">Slip Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advisor info */}
        {profile.advisor_status === 'active' && (
          <Card className="bg-emerald-500/5 border-emerald-500/30">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium text-sm">Verified Advisor</span>
                {advisorSince && <span className="text-slate-500 text-xs">since {advisorSince}</span>}
              </div>
              {profile.advisor_specialty && (
                <p className="text-sm text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  {profile.advisor_specialty}
                </p>
              )}
              {profile.advisor_fee && (
                <p className="text-sm text-slate-300">Consultation fee: {profile.advisor_fee}</p>
              )}
              <Link
                href={`/messages?new=${profile.id}`}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Send a Message
              </Link>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-slate-600 text-center">
          Stats are pulled directly from this user's verified betting history on Ariel MINT.
        </p>
      </div>
    </div>
  )
}
