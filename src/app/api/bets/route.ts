import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { betSchema } from '@/lib/validations/bet.schema'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const sport = searchParams.get('sport')
  const bookmaker = searchParams.get('bookmaker')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('bets')
    .select('*, legs:bet_legs(*)', { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('placed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (sport) query = query.eq('sport', sport)
  if (bookmaker) query = query.eq('bookmaker', bookmaker)
  if (from) query = query.gte('placed_at', from)
  if (to) query = query.lte('placed_at', to)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bets: data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = betSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { legs, ...betData } = parsed.data as typeof parsed.data & { legs?: unknown[] }

  const { data: bet, error } = await supabase
    .from('bets')
    .insert({ ...betData, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert legs if accumulator
  if (legs && Array.isArray(legs) && legs.length > 0) {
    await supabase.from('bet_legs').insert(
      (legs as Record<string, unknown>[]).map((leg: Record<string, unknown>) => ({ ...leg, bet_id: bet.id, user_id: user.id }))
    )
  }

  // Trigger risk engine check (fire-and-forget)
  await inngest.send({
    name: 'risk/check.requested',
    data: { userId: user.id, betId: bet.id, trigger: 'bet_created' },
  }).catch(() => {}) // don't fail if Inngest is unavailable

  return NextResponse.json({ bet }, { status: 201 })
}
