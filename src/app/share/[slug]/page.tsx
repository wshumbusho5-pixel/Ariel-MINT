import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatPct } from '@/lib/utils/currency'

export default async function ShareCardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: card } = await supabase
    .from('share_cards')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!card) notFound()

  // Check expiry
  if (card.expires_at && new Date(card.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-400 text-lg">This share card has expired.</p>
        </div>
      </div>
    )
  }

  const meta = card.metadata as {
    username: string
    tier: string
    currency: string
    total_pl: number
    roi_pct: number
    win_rate_pct: number
    total_bets: number
    bankroll: number
    generated_at: string
  }

  const TIER_COLORS: Record<string, string> = {
    novice: 'text-slate-400',
    bronze: 'text-amber-600',
    silver: 'text-slate-300',
    gold: 'text-yellow-400',
    platinum: 'text-cyan-400',
    elite: 'text-purple-400',
  }

  const TIER_ICONS: Record<string, string> = {
    novice: '🎯', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💠', elite: '👑'
  }

  const tierColor = TIER_COLORS[meta.tier] ?? 'text-slate-400'
  const isProfit = meta.total_pl >= 0

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className={`p-6 border-b border-slate-800 ${isProfit ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">Ariel MINT</span>
              <span className={`text-sm font-medium capitalize ${tierColor}`}>
                {TIER_ICONS[meta.tier]} {meta.tier}
              </span>
            </div>
            <p className="text-white font-bold text-lg mt-3">{meta.username}</p>
            <p className="text-slate-400 text-sm">Performance Card</p>
          </div>

          {/* P&L Hero */}
          <div className="p-6 border-b border-slate-800 text-center">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Total Profit / Loss</p>
            <p className={`text-4xl font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{formatCurrency(meta.total_pl, meta.currency)}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 divide-x divide-slate-800">
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">ROI</p>
              <p className={`text-lg font-bold ${meta.roi_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {meta.roi_pct >= 0 ? '+' : ''}{meta.roi_pct.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Win Rate</p>
              <p className="text-lg font-bold text-white">{meta.win_rate_pct.toFixed(1)}%</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Bets</p>
              <p className="text-lg font-bold text-white">{meta.total_bets}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-slate-600">
              {new Date(meta.generated_at).toLocaleDateString()}
            </p>
            <a
              href="/"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Track yours at Ariel MINT →
            </a>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Stats are a snapshot at time of sharing
        </p>
      </div>
    </div>
  )
}
