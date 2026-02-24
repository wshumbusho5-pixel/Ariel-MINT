import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { GroupChat } from '@/components/chat/GroupChat'
import { Users } from 'lucide-react'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [messagesRes, profileRes] = await Promise.all([
    supabase
      .from('chat_messages')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100),
    supabase.from('profiles').select('username').eq('id', user.id).single(),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Group Chat</h1>
        <span className="text-xs text-slate-500 ml-1">— everyone on Ariel MINT</span>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <GroupChat
          initialMessages={messagesRes.data ?? []}
          currentUserId={user.id}
          currentUsername={profileRes.data?.username ?? 'Unknown'}
        />
      </Card>
    </div>
  )
}
