import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// POST /api/share — create a shareable performance card
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { card_type = 'performance', expires_days = 30 } = await request.json().catch(() => ({}))

  // Gather snapshot data for the card
  const [profileRes, betsRes] = await Promise.all([
    supabase.from('profiles').select('username, tier, current_bankroll, starting_bankroll, currency').eq('id', user.id).single(),
    supabase.from('bets').select('profit_loss, stake, status, sport').eq('user_id', user.id).is('deleted_at', null).neq('status', 'pending'),
  ])

  const profile = profileRes.data
  const bets = betsRes.data ?? []
  const settled = bets.filter(b => ['won', 'lost', 'cashout', 'partial_cashout'].includes(b.status))
  const won = settled.filter(b => b.status === 'won')
  const totalPL = settled.reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const totalStake = settled.reduce((s, b) => s + b.stake, 0)
  const roi = totalStake > 0 ? (totalPL / totalStake) * 100 : 0
  const winRate = settled.length > 0 ? (won.length / settled.length) * 100 : 0

  const metadata = {
    username: profile?.username ?? 'Anonymous',
    tier: profile?.tier ?? 'novice',
    currency: profile?.currency ?? 'USD',
    total_pl: Math.round(totalPL * 100) / 100,
    roi_pct: Math.round(roi * 10) / 10,
    win_rate_pct: Math.round(winRate * 10) / 10,
    total_bets: settled.length,
    bankroll: profile?.current_bankroll ?? 0,
    generated_at: new Date().toISOString(),
  }

  const expiresAt = expires_days
    ? new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  // Try to create share card with unique slug
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug(8)
    const { data: card, error } = await supabase
      .from('share_cards')
      .insert({ user_id: user.id, slug, card_type, metadata, expires_at: expiresAt })
      .select('slug')
      .single()

    if (!error && card) {
      return NextResponse.json({ slug: card.slug }, { status: 201 })
    }
  }

  return NextResponse.json({ error: 'Failed to create share card' }, { status: 500 })
}
