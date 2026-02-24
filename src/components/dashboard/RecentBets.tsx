import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'

interface RecentBet {
  id: string
  event_name: string
  selection: string
  odds: number
  stake: number
  profit_loss: number | null
  status: string
  sport: string
  placed_at: string
  bookmaker: string
}

const STATUS_STYLES: Record<string, string> = {
  won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  lost: 'bg-red-500/10 text-red-400 border-red-500/30',
  void: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  cashout: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  partial_cashout: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
}

export function RecentBets({ bets, currency }: { bets: RecentBet[]; currency?: string }) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
          Recent Results
          <Link href="/bets" className="text-xs text-emerald-400 hover:text-emerald-300 font-normal">
            View all →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {bets.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            No settled bets yet. Start tracking!
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
                  <p className="text-xs text-slate-400 truncate">{bet.event_name} · @ {bet.odds}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${STATUS_STYLES[bet.status] ?? ''}`}
                  >
                    {bet.status.replace('_', ' ')}
                  </Badge>
                  <span className={`text-sm font-semibold ${(bet.profit_loss ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {bet.profit_loss !== null
                      ? `${bet.profit_loss >= 0 ? '+' : ''}${formatCurrency(bet.profit_loss, currency)}`
                      : '—'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
