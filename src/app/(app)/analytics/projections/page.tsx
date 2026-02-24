import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { MonteCarloChart } from '@/components/analytics/MonteCarloChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, AlertCircle } from 'lucide-react'

export default async function ProjectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get cached Monte Carlo results
  const { data: results } = await supabase
    .from('monte_carlo_results')
    .select('*')
    .eq('user_id', user.id)
    .is('invalidated_at', null)
    .order('computed_at', { ascending: false })

  // Check if we have enough bets to compute
  const { count: betCount } = await supabase
    .from('bets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .neq('status', 'pending')

  const hasEnoughData = (betCount ?? 0) >= 10

  // If no results and enough data, trigger computation (fire and forget)
  if (!results || results.length === 0) {
    if (hasEnoughData) {
      await inngest.send({
        name: 'montecarlo/compute.requested',
        data: { userId: user.id },
      }).catch(() => {})
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_bankroll, currency')
    .eq('id', user.id)
    .single()

  // Group by projection_days
  type MCResult = NonNullable<typeof results>[number]
  const byDays = (results ?? []).reduce((acc, r) => {
    acc[r.projection_days] = r
    return acc
  }, {} as Record<number, MCResult>)

  const result30 = byDays[30]
  const result90 = byDays[90]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bankroll Projections</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Monte Carlo simulation based on your historical performance
          </p>
        </div>
        {result30 && (
          <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
            {result30.num_simulations.toLocaleString()} simulations
          </Badge>
        )}
      </div>

      {!hasEnoughData ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-10 h-10 text-slate-500 mb-3" />
            <p className="text-white font-medium mb-1">Not enough data yet</p>
            <p className="text-slate-400 text-sm">
              Settle at least 10 bets to unlock bankroll projections.
              <br />You currently have {betCount ?? 0} settled bets.
            </p>
          </CardContent>
        </Card>
      ) : !result30 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="w-10 h-10 text-emerald-400 mb-3 animate-pulse" />
            <p className="text-white font-medium mb-1">Computing your projections...</p>
            <p className="text-slate-400 text-sm">
              Running 10,000 simulations. Refresh in a minute.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key stats from projections */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Ruin Probability"
              value={`${(result30.ruin_probability * 100).toFixed(1)}%`}
              description="Risk of losing 95% of bankroll"
              danger={result30.ruin_probability > 0.1}
            />
            <StatCard
              label="Expected Bankroll (30d)"
              value={`$${result30.expected_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              description="Median projection"
              positive={result30.expected_value > (profile?.current_bankroll ?? 0)}
            />
            <StatCard
              label="Breakeven Days"
              value={result30.breakeven_days !== null ? `${result30.breakeven_days}d` : 'N/A'}
              description="Days to return to current bankroll"
            />
            <StatCard
              label="Max Drawdown (sim)"
              value={`${result30.max_drawdown_simulated.toFixed(1)}%`}
              description="Worst 10% of simulations"
              danger={result30.max_drawdown_simulated > 50}
            />
          </div>

          {/* 30-day chart */}
          <MonteCarloChart
            result={result30}
            currentBankroll={profile?.current_bankroll ?? 0}
            title="30-Day Projection"
          />

          {/* 90-day chart */}
          {result90 && (
            <MonteCarloChart
              result={result90}
              currentBankroll={profile?.current_bankroll ?? 0}
              title="90-Day Projection"
            />
          )}

          {/* Loss streak insight */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base font-semibold text-white">Streak Analysis</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-slate-300 text-sm">
                Based on your win rate, a losing streak of{' '}
                <span className="text-amber-400 font-semibold">{result30.loss_streak_90th_pct} or more</span>{' '}
                bets happens in roughly 10% of simulations. Plan your bankroll management accordingly.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  description,
  positive,
  danger,
}: {
  label: string
  value: string
  description: string
  positive?: boolean
  danger?: boolean
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${danger ? 'text-red-400' : positive ? 'text-emerald-400' : 'text-white'}`}>
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </CardContent>
    </Card>
  )
}
