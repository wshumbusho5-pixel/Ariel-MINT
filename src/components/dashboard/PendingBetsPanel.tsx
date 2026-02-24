import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { Clock } from 'lucide-react'

interface PendingBet {
  id: string
  event_name: string
  selection: string
  odds: number
  stake: number
  potential_payout: number
  sport: string
  bookmaker: string
  event_date: string
}

export function PendingBetsPanel({ bets, currency }: { bets: PendingBet[]; currency?: string }) {
  const totalExposure = bets.reduce((s, b) => s + b.stake, 0)
  const totalPotential = bets.reduce((s, b) => s + b.potential_payout, 0)

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Bets
          </span>
          <Badge variant="outline" className="text-amber-400 border-amber-400/30">
            {bets.length}
          </Badge>
        </CardTitle>
        {bets.length > 0 && (
          <div className="flex gap-4 text-xs text-slate-400 mt-1">
            <span>At risk: <span className="text-white font-medium">{formatCurrency(totalExposure, currency)}</span></span>
            <span>Potential: <span className="text-emerald-400 font-medium">{formatCurrency(totalPotential, currency)}</span></span>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {bets.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            No pending bets.{' '}
            <Link href="/bets/new" className="text-emerald-400 hover:underline">Add one</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {bets.map(bet => (
              <Link
                key={bet.id}
                href={`/bets/${bet.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{bet.selection}</p>
                  <p className="text-xs text-slate-400 truncate">{bet.event_name} · {bet.bookmaker}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-white">@ {bet.odds}</p>
                  <p className="text-xs text-emerald-400">+{formatCurrency(bet.potential_payout - bet.stake, currency)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
