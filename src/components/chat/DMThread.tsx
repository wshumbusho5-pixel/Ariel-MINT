'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Lock, UserPlus } from 'lucide-react'
import type { DirectMessage, Conversation } from '@/types/database'

const MESSAGE_LIMIT = 5

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

export function DMThread({
  conversation,
  initialMessages,
  currentUserId,
  isMutual,
  otherAlias,
  otherId,
  initialMessageCount,
}: {
  conversation: Conversation
  initialMessages: DirectMessage[]
  currentUserId: string
  isMutual: boolean
  otherAlias: string
  otherId: string
  initialMessageCount: number
}) {
  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages)
  const [msgCount, setMsgCount] = useState(initialMessageCount)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const other = conversation.other_user
  const limitReached = !isMutual && msgCount >= MESSAGE_LIMIT
  const remaining = Math.max(0, MESSAGE_LIMIT - msgCount)

  // Display name: real username if mutual, alias otherwise
  const displayName = isMutual ? (other?.display_name ?? other?.username ?? otherAlias) : otherAlias
  const displaySub = isMutual ? `@${other?.username}` : 'Anonymous · follow each other to reveal identity'

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
        setMsgCount(prev => prev + 1)
        if (msg.receiver_id === currentUserId) {
          fetch(`/api/messages/${conversation.id}/read`, { method: 'PATCH' })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, conversation.id, currentUserId])

  async function send() {
    const text = input.trim()
    if (!text || sending || limitReached) return
    setSending(true)
    setInput('')

    const optimisticId = crypto.randomUUID()
    const optimistic: DirectMessage = {
      id: optimisticId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      receiver_id: otherId,
      content: text,
      read_at: null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    }
    setMessages(prev => [...prev, optimistic])
    setMsgCount(prev => prev + 1)

    const res = await fetch(`/api/messages/${conversation.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })

    if (!res.ok) {
      // Roll back optimistic
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setMsgCount(prev => Math.max(0, prev - 1))
      setInput(text)
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <Link href="/messages">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm flex-shrink-0">
          {displayName[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <p className="text-xs text-slate-400 truncate">{displaySub}</p>
        </div>
        {!isMutual && !limitReached && (
          <span className="text-xs text-slate-500 flex-shrink-0">{remaining} msg{remaining !== 1 ? 's' : ''} left</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {!isMutual && messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">You have {MESSAGE_LIMIT} anonymous messages.</p>
            <p className="text-slate-500 text-xs mt-1">Follow each other to chat freely and reveal identities.</p>
          </div>
        )}
        {isMutual && messages.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-12">No messages yet. Say something!</p>
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

      {/* Limit reached banner */}
      {limitReached && (
        <div className="border-t border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <Lock className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-amber-400">Message limit reached</p>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            Follow each other to continue chatting and reveal your identities
          </p>
          <Link
            href="/community"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Go to Community to Follow
          </Link>
        </div>
      )}

      {/* Input */}
      {!limitReached && (
        <div className="border-t border-slate-800 p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={isMutual ? `Message ${other?.username ?? ''}...` : `Message anonymously (${remaining} left)...`}
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
      )}
    </div>
  )
}
