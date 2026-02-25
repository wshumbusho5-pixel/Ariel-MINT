import { createClient } from '@/lib/supabase/server'
import { TaxReportClient } from '@/components/settings/TaxReportClient'

export default async function TaxReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const currentYear = new Date().getFullYear()

  // Load summary for current year
  const yearStart = `${currentYear}-01-01T00:00:00.000Z`
  const yearEnd = `${currentYear + 1}-01-01T00:00:00.000Z`

  const { data: bets } = await supabase
    .from('bets')
    .select('stake, profit_loss, status')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])
    .gte('placed_at', yearStart)
    .lt('placed_at', yearEnd)

  const rows = bets ?? []
  const totalStake = rows.reduce((s, b) => s + b.stake, 0)
  const totalPL = rows.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const totalWinnings = rows.filter(b => (b.profit_loss ?? 0) > 0).reduce((s, b) => s + (b.profit_loss ?? 0), 0)

  return (
    <TaxReportClient
      currentYear={currentYear}
      betCount={rows.length}
      totalStake={totalStake}
      totalWinnings={totalWinnings}
      netPL={totalPL}
    />
  )
}
