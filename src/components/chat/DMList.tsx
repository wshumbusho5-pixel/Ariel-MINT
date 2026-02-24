'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MessageCircle } from 'lucide-react'
import { UserPicker } from './UserPicker'
import type { Conversation } from '@/types/database'

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(dateStr).toLocaleDateString()
}

export function DMList({ initialConversations, currentUserId }: {
  initialConversations: Conversation[]
  currentUserId: string
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [showPicker, setShowPicker] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to new DMs so unread counts update live
    const channel = supabase
      .channel('dm-list')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${currentUserId}`,
      }, () => {
        // Reload conversations to get updated unread counts
        fetch('/api/messages/conversations')
          .then(r => r.json())
          .then(data => { if (Array.isArray(data)) setConversations(data) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, currentUserId])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <Button
          onClick={() => setShowPicker(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Message
        </Button>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <MessageCircle className="w-12 h-12 text-slate-700" />
          <p className="text-slate-500 text-sm">No conversations yet</p>
          <Button onClick={() => setShowPicker(true)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
            Start a conversation
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map(conv => {
            const other = conv.other_user
            const initials = (other?.username ?? '?')[0].toUpperCase()
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white truncate">
                      {other?.display_name ?? other?.username ?? 'Unknown'}
                    </p>
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                      {timeAgo(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-400 truncate">
                      {conv.last_message ?? 'Start the conversation'}
                    </p>
                    {(conv.unread_count ?? 0) > 0 && (
                      <Badge className="ml-2 flex-shrink-0 h-5 min-w-5 px-1 bg-emerald-500 text-slate-950 text-[10px] font-bold border-0">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showPicker && <UserPicker onClose={() => setShowPicker(false)} />}
    </>
  )
}
