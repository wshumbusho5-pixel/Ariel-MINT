'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send } from 'lucide-react'
import type { DirectMessage, Conversation } from '@/types/database'

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

export function DMThread({ conversation, initialMessages, currentUserId }: {
  conversation: Conversation
  initialMessages: DirectMessage[]
  currentUserId: string
}) {
  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const other = conversation.other_user

  // Mark as read on mount
  useEffect(() => {
    fetch(`/api/messages/${conversation.id}/read`, { method: 'PATCH' })
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`dm-${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const msg = payload.new as DirectMessage
        setMessages(prev => [...prev, msg])
        // Mark new incoming messages as read
        if (msg.receiver_id === currentUserId) {
          fetch(`/api/messages/${conversation.id}/read`, { method: 'PATCH' })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, conversation.id, currentUserId])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')

    // Optimistic
    const optimistic: DirectMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      sender_id: currentUserId,
      receiver_id: conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id,
      content: text,
      read_at: null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    }
    setMessages(prev => [...prev, optimistic])

    await fetch(`/api/messages/${conversation.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800 mb-0">
        <Link href="/messages">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm flex-shrink-0">
          {(other?.username ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{other?.display_name ?? other?.username}</p>
          <p className="text-xs text-slate-400">@{other?.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-12">
            No messages yet. Say something!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                isOwn
                  ? 'bg-emerald-500 text-slate-950 rounded-br-sm'
                  : 'bg-slate-800 text-slate-100 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-slate-600 px-1">
                {timeAgo(msg.created_at)}
                {isOwn && msg.read_at && ' · Read'}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={`Message ${other?.username ?? ''}...`}
          className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
          maxLength={1000}
        />
        <Button
          onClick={send}
          disabled={!input.trim() || sending}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex-shrink-0"
          size="sm"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
