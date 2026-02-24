import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Build query
  let query = supabase
    .from('bets')
    .select('profit_loss, stake, odds, status, placed_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .neq('status', 'pending')

  if (from) query = query.gte('placed_at', from)
  if (to) query = query.lte('placed_at', to)

  const { data: bets, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!bets || bets.length === 0) {
    return NextResponse.json({
      total_pl: 0,
      total_stake: 0,
      roi_pct: 0,
      win_count: 0,
      loss_count: 0,
      void_count: 0,
      total_settled: 0,
      win_rate_pct: 0,
      avg_odds: 0,
      avg_stake: 0,
      best_win: null,
      worst_loss: null,
    })
  }

  const won = bets.filter(b => b.status === 'won')
  const lost = bets.filter(b => b.status === 'lost')
  const voided = bets.filter(b => b.status === 'void')
  const settled = bets.filter(b => ['won','lost','cashout','partial_cashout'].includes(b.status))

  const total_pl = bets.reduce((sum, b) => sum + (b.profit_loss ?? 0), 0)
  const total_stake = bets.reduce((sum, b) => sum + b.stake, 0)
  const roi_pct = total_stake > 0 ? (total_pl / total_stake) * 100 : 0
  const win_rate_pct = (won.length + lost.length) > 0
    ? (won.length / (won.length + lost.length)) * 100
    : 0
  const avg_odds = bets.reduce((sum, b) => sum + b.odds, 0) / bets.length
  const avg_stake = total_stake / bets.length

  const profits = won.map(b => b.profit_loss ?? 0)
  const losses = lost.map(b => b.profit_loss ?? 0)

  return NextResponse.json({
    total_pl: Math.round(total_pl * 100) / 100,
    total_stake: Math.round(total_stake * 100) / 100,
    roi_pct: Math.round(roi_pct * 100) / 100,
    win_count: won.length,
    loss_count: lost.length,
    void_count: voided.length,
    total_settled: settled.length,
    win_rate_pct: Math.round(win_rate_pct * 100) / 100,
    avg_odds: Math.round(avg_odds * 10000) / 10000,
    avg_stake: Math.round(avg_stake * 100) / 100,
    best_win: profits.length > 0 ? Math.max(...profits) : null,
    worst_loss: losses.length > 0 ? Math.min(...losses) : null,
  })
}
