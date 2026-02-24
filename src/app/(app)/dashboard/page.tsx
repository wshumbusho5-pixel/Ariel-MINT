import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatPL, formatPct } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Target, Wallet, BarChart3, Award } from 'lucide-react'
import { BankrollChart } from '@/components/dashboard/BankrollChart'
import { PendingBetsPanel } from '@/components/dashboard/PendingBetsPanel'
import { RecentBets } from '@/components/dashboard/RecentBets'
import { RiskAlertBanner } from '@/components/risk/RiskAlertBanner'
import { RealtimeBankroll } from '@/components/dashboard/RealtimeBankroll'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Load all data server-side in parallel
  const [profileRes, snapshotsRes, pendingRes, recentRes, alertsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('current_bankroll, starting_bankroll, peak_bankroll, tier, tier_points, currency')
      .eq('id', user.id)
      .single(),
    supabase
      .from('bankroll_snapshots')
      .select('snapshot_date, bankroll, daily_pl, cumulative_pl')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true })
      .limit(90),
    supabase
      .from('bets')
      .select('id, event_name, selection, odds, stake, potential_payout, sport, bookmaker, event_date')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('event_date', { ascending: true })
      .limit(10),
    supabase
      .from('bets')
      .select('id, event_name, selection, odds, stake, profit_loss, status, sport, placed_at, bookmaker')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'pending')
      .order('placed_at', { ascending: false })
      .limit(10),
    supabase
      .from('risk_alerts')
      .select('id, alert_type, severity, title, message, created_at')
      .eq('user_id', user.id)
      .is('dismissed_at', null)
      .in('severity', ['warning', 'critical'])
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  // Calculate summary stats from recent bets (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: last30Bets } = await supabase
    .from('bets')
    .select('profit_loss, stake, status, odds')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .neq('status', 'pending')
    .gte('placed_at', thirtyDaysAgo)

  const profile = profileRes.data
  const snapshots = snapshotsRes.data ?? []
  const pendingBets = pendingRes.data ?? []
  const recentBets = recentRes.data ?? []
  const activeAlerts = alertsRes.data ?? []
  const bets30 = last30Bets ?? []

  const totalPL = bets30.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const totalStake = bets30.reduce((s, b) => s + b.stake, 0)
  const roi30 = totalStake > 0 ? (totalPL / totalStake) * 100 : 0
  const won30 = bets30.filter(b => b.status === 'won').length
  const settled30 = bets30.filter(b => ['won','lost'].includes(b.status)).length
  const winRate30 = settled30 > 0 ? (won30 / settled30) * 100 : 0
  const currentProfit = (profile?.current_bankroll ?? 0) - (profile?.starting_bankroll ?? 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Your betting performance at a glance</p>
        </div>
        {profile?.tier && (
          <Badge className="capitalize bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <Award className="w-3 h-3 mr-1" />
            {profile.tier}
          </Badge>
        )}
      </div>

      {/* Risk alert banners */}
      {activeAlerts.length > 0 && (
        <RiskAlertBanner alerts={activeAlerts} />
      )}

      {/* Realtime bankroll — updates live via Supabase subscription */}
      <RealtimeBankroll
        userId={user.id}
        initialBankroll={profile?.current_bankroll ?? 0}
        initialProfit={currentProfit}
        currency={profile?.currency}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Bankroll"
          value={formatCurrency(profile?.current_bankroll ?? 0, profile?.currency)}
          icon={<Wallet className="w-4 h-4" />}
          description={`Started at ${formatCurrency(profile?.starting_bankroll ?? 0, profile?.currency)}`}
        />
        <StatCard
          title="Total P&L"
          value={formatPL(currentProfit, profile?.currency)}
          icon={currentProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          positive={currentProfit >= 0}
          description="All time"
        />
        <StatCard
          title="30-Day ROI"
          value={formatPct(roi30)}
          icon={<BarChart3 className="w-4 h-4" />}
          positive={roi30 >= 0}
          description={`${bets30.length} bets`}
        />
        <StatCard
          title="Win Rate (30d)"
          value={`${winRate30.toFixed(1)}%`}
          icon={<Target className="w-4 h-4" />}
          description={`${won30}/${settled30} settled`}
        />
      </div>

      {/* Bankroll chart */}
      <BankrollChart snapshots={snapshots} currentBankroll={profile?.current_bankroll ?? 0} />

      {/* Pending bets + Recent bets */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PendingBetsPanel bets={pendingBets} currency={profile?.currency} />
        <RecentBets bets={recentBets} currency={profile?.currency} />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  description,
  positive,
}: {
  title: string
  value: string
  icon: React.ReactNode
  description?: string
  positive?: boolean
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</CardTitle>
        <span className={positive === undefined ? 'text-slate-400' : positive ? 'text-emerald-400' : 'text-red-400'}>
          {icon}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className={`text-xl font-bold ${positive === undefined ? 'text-white' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {value}
        </div>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </CardContent>
    </Card>
  )
}
