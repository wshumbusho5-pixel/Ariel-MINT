'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'

interface Bet {
  id: string
  sport: string
  event_name: string
  selection: string
  odds: number
  stake: number
  potential_payout: number
  profit_loss: number | null
  status: string
  placed_at: string
  bookmaker: string
  bet_type: string
  tags: string[]
  ocr_source_url: string | null
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  lost: 'bg-red-500/10 text-red-400 border-red-500/30',
  void: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  cashout: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  partial_cashout: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
}

export function BetTable({
  bets,
  total,
  page,
  limit,
}: {
  bets: Bet[]
  total: number
  page: number
  limit: number
}) {
  const router = useRouter()
  const totalPages = Math.ceil(total / limit)

  function goToPage(p: number) {
    const params = new URLSearchParams(window.location.search)
    params.set('page', String(p))
    router.push(`/bets?${params.toString()}`)
  }

  if (bets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-slate-400 text-lg mb-2">No bets found</p>
        <p className="text-slate-500 text-sm mb-4">Try changing your filters or add your first bet</p>
        <Link href="/bets/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
            Add your first bet
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs">Selection</TableHead>
              <TableHead className="text-slate-400 text-xs hidden sm:table-cell">Bookmaker</TableHead>
              <TableHead className="text-slate-400 text-xs">Odds</TableHead>
              <TableHead className="text-slate-400 text-xs">Stake</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell">Return</TableHead>
              <TableHead className="text-slate-400 text-xs">P&L</TableHead>
              <TableHead className="text-slate-400 text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bets.map(bet => (
              <TableRow
                key={bet.id}
                className="border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => router.push(`/bets/${bet.id}`)}
              >
                <TableCell>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white">{bet.selection}</p>
                      {bet.ocr_source_url && (
                        <span title="Slip verified">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-[180px]">{bet.event_name}</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5 text-slate-500 border-slate-700 py-0">
                      {bet.sport}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-slate-300">{bet.bookmaker}</TableCell>
                <TableCell className="text-sm font-medium text-white">{bet.odds}</TableCell>
                <TableCell className="text-sm text-slate-300">{formatCurrency(bet.stake)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-slate-300">
                  {formatCurrency(bet.potential_payout)}
                </TableCell>
                <TableCell>
                  {bet.profit_loss !== null ? (
                    <span className={`text-sm font-semibold ${bet.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {bet.profit_loss >= 0 ? '+' : ''}{formatCurrency(bet.profit_loss)}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs capitalize ${STATUS_BADGE[bet.status] ?? ''}`}>
                    {bet.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} bets
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
