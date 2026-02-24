import { createClient } from '@/lib/supabase/server'
import { DMList } from '@/components/chat/DMList'
import type { Conversation } from '@/types/database'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Load conversations with other user info and unread count
  const { data: rawConvs } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false })

  if (!rawConvs?.length) {
    return (
      <div className="max-w-lg mx-auto">
        <DMList initialConversations={[]} currentUserId={user.id} />
      </div>
    )
  }

  // Get other user IDs and last messages
  const otherIds = rawConvs.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id)
  const convIds = rawConvs.map(c => c.id)

  const [profilesRes, unreadRes, lastMsgRes] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name').in('id', otherIds),
    supabase
      .from('direct_messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('receiver_id', user.id)
      .is('read_at', null)
      .is('deleted_at', null),
    supabase
      .from('direct_messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', convIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]))
  const unreadMap: Record<string, number> = {}
  for (const dm of (unreadRes.data ?? [])) {
    unreadMap[dm.conversation_id] = (unreadMap[dm.conversation_id] ?? 0) + 1
  }
  const lastMsgMap: Record<string, string> = {}
  for (const dm of (lastMsgRes.data ?? [])) {
    if (!lastMsgMap[dm.conversation_id]) lastMsgMap[dm.conversation_id] = dm.content
  }

  const conversations: Conversation[] = rawConvs.map(c => {
    const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id
    return {
      ...c,
      other_user: profileMap[otherId],
      unread_count: unreadMap[c.id] ?? 0,
      last_message: lastMsgMap[c.id],
    }
  })

  return (
    <div className="max-w-lg mx-auto">
      <DMList initialConversations={conversations} currentUserId={user.id} />
    </div>
  )
}
