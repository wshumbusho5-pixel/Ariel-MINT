'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import type { ChatMessage } from '@/types/database'

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

export function GroupChat({ initialMessages, currentUserId, currentUsername }: {
  initialMessages: ChatMessage[]
  currentUserId: string
  currentUsername: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel('group-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as ChatMessage
        if (msg.deleted_at) return
        setMessages(prev => [...prev, msg])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')

    // Optimistic insert
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: currentUserId,
      username: currentUsername,
      content: text,
      created_at: new Date().toISOString(),
      deleted_at: null,
    }
    setMessages(prev => [...prev, optimistic])

    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-12">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.user_id === currentUserId
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn && (
                <span className="text-xs text-slate-500 px-1">{msg.username}</span>
              )}
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                isOwn
                  ? 'bg-emerald-500 text-slate-950 rounded-br-sm'
                  : 'bg-slate-800 text-slate-100 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-slate-600 px-1">{timeAgo(msg.created_at)}</span>
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
          placeholder="Message everyone..."
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
