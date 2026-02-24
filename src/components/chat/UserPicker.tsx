'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Search, Loader2 } from 'lucide-react'

interface User {
  id: string
  username: string
  display_name: string | null
}

export function UserPicker({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/chat/users')
      .then(r => r.json())
      .then(data => { setUsers(data); setLoading(false) })
  }, [])

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    (u.display_name?.toLowerCase().includes(query.toLowerCase()))
  )

  async function startDM(userId: string) {
    setStarting(userId)
    const res = await fetch('/api/messages/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ other_user_id: userId }),
    })
    const conv = await res.json()
    if (conv.id) {
      router.push(`/messages/${conv.id}`)
      onClose()
    }
    setStarting(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-sm font-semibold text-white">New Message</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">No users found</p>
          )}
          {filtered.map(user => (
            <button
              key={user.id}
              onClick={() => startDM(user.id)}
              disabled={starting === user.id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm flex-shrink-0">
                {user.username[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.display_name ?? user.username}</p>
                <p className="text-xs text-slate-400 truncate">@{user.username}</p>
              </div>
              {starting === user.id && <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
