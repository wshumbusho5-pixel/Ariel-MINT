import { createClient } from '@/lib/supabase/server'
import { computeHonesty } from '@/lib/analytics/honestyEngine'
import { HonestyReport } from '@/components/analytics/HonestyReport'
import { MonthlyStatement } from '@/components/analytics/MonthlyStatement'
import { Card, CardContent } from '@/components/ui/card'
import { Activity } from 'lucide-react'

export default async function PerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user.id)
    .single()

  const { data: bets } = await supabase
    .from('bets')
    .select('odds, stake, status, profit_loss, placed_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('placed_at', { ascending: true })

  const allBets = bets ?? []
  const metrics = computeHonesty(allBets)
  const currency = profile?.currency ?? 'USD'

  if (allBets.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance Analysis</h1>
          <p className="text-slate-400 text-sm mt-0.5">Skill vs variance — the truth about your betting</p>
        </div>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No bet data yet.</p>
            <p className="text-slate-500 text-sm mt-1">Log some bets to see your performance analysis.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Performance Analysis</h1>
        <p className="text-slate-400 text-sm mt-0.5">Skill vs variance — the truth about your betting</p>
      </div>

      <HonestyReport metrics={metrics} currency={currency} />
      <MonthlyStatement months={metrics.monthlyPL} currency={currency} />
    </div>
  )
}
