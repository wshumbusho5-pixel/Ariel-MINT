import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DMThread } from '@/components/chat/DMThread'
import type { Conversation } from '@/types/database'

export default async function DMThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { conversationId } = await params

  const [convRes, messagesRes] = await Promise.all([
    supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single(),
    supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100),
  ])

  if (!convRes.data) notFound()
  const conv = convRes.data

  // Verify user is a participant
  if (conv.user1_id !== user.id && conv.user2_id !== user.id) notFound()

  // Load other user's profile
  const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', otherId)
    .single()

  const conversation: Conversation = {
    ...conv,
    other_user: otherProfile ?? undefined,
  }

  return (
    <div className="max-w-2xl mx-auto">
      <DMThread
        conversation={conversation}
        initialMessages={messagesRes.data ?? []}
        currentUserId={user.id}
      />
    </div>
  )
}
