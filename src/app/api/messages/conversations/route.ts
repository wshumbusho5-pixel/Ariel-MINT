import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { other_user_id } = await request.json()
  if (!other_user_id) return NextResponse.json({ error: 'other_user_id required' }, { status: 400 })
  if (other_user_id === user.id) return NextResponse.json({ error: 'Cannot DM yourself' }, { status: 400 })

  // Use sorted IDs so we always get the same row regardless of who initiates
  const [u1, u2] = [user.id, other_user_id].sort()

  const { data, error } = await supabase
    .from('conversations')
    .upsert({ user1_id: u1, user2_id: u2 }, { onConflict: 'user1_id,user2_id', ignoreDuplicates: false })
    .select()
    .single()

  if (error) {
    // May already exist — try to fetch
    const { data: existing } = await supabase
      .from('conversations')
      .select()
      .or(`and(user1_id.eq.${u1},user2_id.eq.${u2})`)
      .single()
    if (existing) return NextResponse.json(existing)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
