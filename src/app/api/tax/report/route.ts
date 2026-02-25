import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  const yearStart = `${year}-01-01T00:00:00.000Z`
  const yearEnd = `${year + 1}-01-01T00:00:00.000Z`

  const { data: bets } = await supabase
    .from('bets')
    .select('placed_at, event_name, sport, bookmaker, odds, stake, status, profit_loss, actual_payout')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])
    .gte('placed_at', yearStart)
    .lt('placed_at', yearEnd)
    .order('placed_at', { ascending: true })

  const rows = bets ?? []

  const totalStake = rows.reduce((s, b) => s + b.stake, 0)
  const totalPL = rows.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const totalWinnings = rows
    .filter(b => (b.profit_loss ?? 0) > 0)
    .reduce((s, b) => s + (b.profit_loss ?? 0), 0)

  // Build CSV
  const lines: string[] = [
    'Date,Event,Sport,Bookmaker,Odds,Stake,Outcome,Profit/Loss',
    ...rows.map(b => {
      const date = new Date(b.placed_at).toLocaleDateString('en-CA') // YYYY-MM-DD
      const outcome = b.status.charAt(0).toUpperCase() + b.status.slice(1)
      const pl = b.profit_loss != null ? b.profit_loss.toFixed(2) : '0.00'
      // Escape commas in text fields
      const event = `"${(b.event_name ?? '').replace(/"/g, '""')}"`
      return `${date},${event},${b.sport ?? ''},${b.bookmaker ?? ''},${b.odds ?? ''},${b.stake.toFixed(2)},${outcome},${pl}`
    }),
    '',
    `,,,,,,Total Stake,${totalStake.toFixed(2)}`,
    `,,,,,,Total Winnings,${totalWinnings.toFixed(2)}`,
    `,,,,,,Net P&L,${totalPL.toFixed(2)}`,
    `,,,,,,Bets,${rows.length}`,
  ]

  const csv = lines.join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ariel-mint-tax-${year}.csv"`,
    },
  })
}
