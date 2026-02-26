import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await params
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })

  // Verify user is a participant
  const { data: conv } = await supabase
    .from('conversations')
    .select('user1_id, user2_id')
    .eq('id', conversationId)
    .single()

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  if (conv.user1_id !== user.id && conv.user2_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const receiverId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id

  // Enforce 5-message anonymous limit unless mutual follow
  const [iFollowRes, theyFollowRes] = await Promise.all([
    supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', receiverId).maybeSingle(),
    supabase.from('follows').select('id').eq('follower_id', receiverId).eq('following_id', user.id).maybeSingle(),
  ])
  const isMutual = !!iFollowRes.data && !!theyFollowRes.data

  if (!isMutual) {
    const { count } = await supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return NextResponse.json(data)
}
