'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, Plus, ShieldAlert, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

export function TopBar({ username, userId }: { username: string; userId?: string }) {
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [unreadDMs, setUnreadDMs] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    // Load unread alert count
    async function loadAlerts() {
      const { count } = await supabase
        .from('risk_alerts')
        .select('*', { count: 'exact', head: true })
        .is('dismissed_at', null)
      setUnreadAlerts(count ?? 0)
    }
    loadAlerts()

    // Realtime subscription for new alerts
    const channel = supabase
      .channel('topbar-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'risk_alerts' }, () => {
        setUnreadAlerts(c => c + 1)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'risk_alerts' }, () => {
        loadAlerts()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  useEffect(() => {
    if (!userId) return

    async function loadUnreadDMs() {
      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId!)
        .is('read_at', null)
        .is('deleted_at', null)
      setUnreadDMs(count ?? 0)
    }
    loadUnreadDMs()

    const channel = supabase
      .channel('topbar-dms')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`,
      }, () => {
        setUnreadDMs(c => c + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`,
      }, () => {
        loadUnreadDMs()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId])

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
          A
        </div>
        <span className="font-bold text-white">Ariel MINT</span>
      </div>

      {/* Desktop greeting */}
      <div className="hidden lg:block">
        <p className="text-sm text-slate-400">
          Welcome back, <span className="text-white font-medium">{username}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link href="/bets/new">
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Add Bet</span>
          </Button>
        </Link>

        <Link href="/messages">
          <Button size="sm" variant="ghost" className="relative text-slate-400 hover:text-white">
            <MessageCircle className={`w-5 h-5 ${unreadDMs > 0 ? 'text-emerald-400' : ''}`} />
            {unreadDMs > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-emerald-500 border-0">
                {unreadDMs > 9 ? '9+' : unreadDMs}
              </Badge>
            )}
          </Button>
        </Link>

        <Link href="/risk">
          <Button size="sm" variant="ghost" className="relative text-slate-400 hover:text-white">
            {unreadAlerts > 0 ? <ShieldAlert className="w-5 h-5 text-amber-400" /> : <Bell className="w-5 h-5" />}
            {unreadAlerts > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 border-0">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </Badge>
            )}
          </Button>
        </Link>
      </div>
    </header>
  )
}
