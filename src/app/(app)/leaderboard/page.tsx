import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy } from 'lucide-react'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const currentMonth = new Date()
  currentMonth.setDate(1)
  const monthStr = currentMonth.toISOString().slice(0, 10)

  const { data: leaderboard } = await supabase
    .from('leaderboard_snapshots')
    .select('*')
    .eq('snapshot_month', monthStr)
    .order('monthly_roi_pct', { ascending: false })
    .limit(50)

  const { data: mySnapshot } = await supabase
    .from('leaderboard_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .eq('snapshot_month', monthStr)
    .single()

  const entries = leaderboard ?? []

  const TIER_ICONS: Record<string, string> = {
    novice: '🎯', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💠', elite: '👑'
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Anonymous monthly rankings — {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Badge variant="outline" className="text-slate-400 border-slate-700">
          <Users className="w-3 h-3 mr-1" />
          {entries.length} bettors
        </Badge>
      </div>

      {mySnapshot && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{TIER_ICONS[mySnapshot.tier] ?? '🎯'}</span>
              <div>
                <p className="text-sm font-medium text-white">{mySnapshot.display_alias} <span className="text-emerald-400 text-xs">(you)</span></p>
                <p className="text-xs text-slate-400">#{entries.findIndex(e => e.user_id === user.id) + 1} this month</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${(mySnapshot.monthly_roi_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {mySnapshot.monthly_roi_pct !== null ? `${mySnapshot.monthly_roi_pct >= 0 ? '+' : ''}${mySnapshot.monthly_roi_pct.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-slate-400">Monthly ROI</p>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="w-10 h-10 text-slate-500 mb-3" />
            <p className="text-white font-medium">No leaderboard data yet</p>
            <p className="text-slate-400 text-sm mt-1">
              The leaderboard refreshes on the 1st of each month.
              <br />Enable &quot;Public Profile&quot; in settings to appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                entry.user_id === user.id
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-lg font-bold w-8 text-center ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'
                }`}>
                  {i + 1}
                </span>
                <span className="text-xl">{TIER_ICONS[entry.tier] ?? '🎯'}</span>
                <div>
                  <p className="text-sm font-medium text-white">{entry.display_alias}</p>
                  <p className="text-xs text-slate-400 capitalize">{entry.tier} · {entry.total_bets ?? 0} bets</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${(entry.monthly_roi_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {entry.monthly_roi_pct !== null ? `${entry.monthly_roi_pct >= 0 ? '+' : ''}${entry.monthly_roi_pct.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-slate-500">{entry.win_rate_pct?.toFixed(1)}% win</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
