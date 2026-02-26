import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/follows — toggle follow/unfollow
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { following_id } = await request.json()
  if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 })
  if (following_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  // Check if already following
  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', following_id)
    .maybeSingle()

  if (existing) {
    // Unfollow
    await supabase.from('follows').delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id)
    return NextResponse.json({ following: false })
  } else {
    // Follow
    await supabase.from('follows').insert({ follower_id: user.id, following_id })
    return NextResponse.json({ following: true })
  }
}
