import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { settleBetSchema } from '@/lib/validations/bet.schema'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = settleBetSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { status, actual_payout, settled_at } = parsed.data

  const updateData: Record<string, unknown> = {
    status,
    settled_at: settled_at ?? new Date().toISOString(),
  }

  if (status === 'cashout' || status === 'partial_cashout') {
    updateData.actual_payout = actual_payout
  }

  const { data: bet, error } = await supabase
    .from('bets')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending')  // can only settle pending bets
    .is('deleted_at', null)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger risk engine (post-settlement check)
  await inngest.send({
    name: 'risk/check.requested',
    data: { userId: user.id, betId: id, trigger: 'bet_settled' },
  }).catch(() => {})

  // Trigger withdrawal target check
  await inngest.send({
    name: 'withdrawal/check.requested',
    data: { userId: user.id },
  }).catch(() => {})

  return NextResponse.json({ bet })
}
