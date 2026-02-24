'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatPL } from '@/lib/utils/currency'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface RealtimeBankrollProps {
  userId: string
  initialBankroll: number
  initialProfit: number
  currency?: string
}

export function RealtimeBankroll({ userId, initialBankroll, initialProfit, currency }: RealtimeBankrollProps) {
  const [bankroll, setBankroll] = useState(initialBankroll)
  const [profit, setProfit] = useState(initialProfit)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('profile-bankroll')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as { current_bankroll: number; starting_bankroll: number }
          setBankroll(updated.current_bankroll)
          setProfit(updated.current_bankroll - updated.starting_bankroll)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase])

  const isProfit = profit >= 0

  return (
    <div className="flex items-center gap-6">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">Bankroll</p>
        <p className="text-2xl font-bold text-white tabular-nums">
          {formatCurrency(bankroll, currency)}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">All-time P&L</p>
        <p className={`text-xl font-bold tabular-nums flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
          {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {formatPL(profit, currency)}
        </p>
      </div>
    </div>
  )
}
