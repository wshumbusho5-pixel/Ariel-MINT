import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPct } from '@/lib/utils/currency'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'
import { BreakdownChart } from '@/components/analytics/BreakdownChart'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: bets } = await supabase
    .from('bets')
    .select('sport, bookmaker, profit_loss, stake, status, placed_at, odds')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .neq('status', 'pending')

  const allBets = bets ?? []

  function groupBy(key: keyof typeof allBets[0]) {
    const groups: Record<string, { pl: number; stake: number; wins: number; losses: number; total: number }> = {}
    for (const bet of allBets) {
      const k = String(bet[key] ?? 'Unknown')
      if (!groups[k]) groups[k] = { pl: 0, stake: 0, wins: 0, losses: 0, total: 0 }
      groups[k].pl += bet.profit_loss ?? 0
      groups[k].stake += bet.stake
      groups[k].total++
      if (bet.status === 'won') groups[k].wins++
      if (bet.status === 'lost') groups[k].losses++
    }
    return Object.entries(groups)
      .map(([label, data]) => ({
        label,
        pl: Math.round(data.pl * 100) / 100,
        roi: data.stake > 0 ? Math.round((data.pl / data.stake) * 10000) / 100 : 0,
        total: data.total,
        winRate: (data.wins + data.losses) > 0 ? Math.round(data.wins / (data.wins + data.losses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.pl - a.pl)
      .slice(0, 8)
  }

  const bySport = groupBy('sport')
  const byBookmaker = groupBy('bookmaker')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Breakdown of your betting performance</p>
        </div>
        <Link href="/analytics/projections">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <TrendingUp className="w-4 h-4 mr-2" />
            Projections
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <BreakdownChart title="P&L by Sport" data={bySport} />
        <BreakdownChart title="P&L by Bookmaker" data={byBookmaker} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <BreakdownTable title="Sport Breakdown" data={bySport} />
        <BreakdownTable title="Bookmaker Breakdown" data={byBookmaker} />
      </div>
    </div>
  )
}


function BreakdownTable({ title, data }: {
  title: string
  data: { label: string; pl: number; roi: number; total: number; winRate: number }[]
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {data.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">No data yet</p>
        ) : (
          <div className="space-y-2">
            {data.map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{row.label}</p>
                  <p className="text-xs text-slate-500">{row.total} bets · {row.winRate}% win</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${row.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.pl >= 0 ? '+' : ''}{formatCurrency(row.pl)}
                  </p>
                  <p className={`text-xs ${row.roi >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {formatPct(row.roi)} ROI
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
