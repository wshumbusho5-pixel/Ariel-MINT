'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/currency'
import { CheckCircle, Trash2, ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import type { Bet } from '@/types/database'

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  lost: 'bg-red-500/10 text-red-400 border-red-500/30',
  void: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  cashout: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  partial_cashout: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
}

export function BetDetailView({ bet }: { bet: Bet }) {
  const router = useRouter()
  const supabase = createClient()
  const [settling, setSettling] = useState(false)
  const [settleStatus, setSettleStatus] = useState('won')
  const [actualPayout, setActualPayout] = useState('')
  const [settleOpen, setSettleOpen] = useState(false)

  async function settleBet() {
    setSettling(true)
    try {
      const body: Record<string, unknown> = { status: settleStatus }
      if (settleStatus === 'cashout' || settleStatus === 'partial_cashout') {
        body.actual_payout = parseFloat(actualPayout) || 0
      }

      const res = await fetch(`/api/bets/${bet.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to settle bet')

      toast.success(`Bet marked as ${settleStatus}!`)
      setSettleOpen(false)
      router.refresh()
    } catch {
      toast.error('Failed to settle bet')
    } finally {
      setSettling(false)
    }
  }

  async function deleteBet() {
    if (!confirm('Delete this bet? This cannot be undone.')) return

    const { error } = await supabase
      .from('bets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', bet.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Bet deleted')
      router.push('/bets')
      router.refresh()
    }
  }

  const pl = bet.profit_loss
  const isPending = bet.status === 'pending'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/bets">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Bets
          </Button>
        </Link>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-white">{bet.selection}</CardTitle>
              <p className="text-slate-400 text-sm mt-0.5">{bet.event_name}</p>
            </div>
            <Badge variant="outline" className={`capitalize ${STATUS_BADGE[bet.status] ?? ''}`}>
              {bet.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* P&L highlight */}
          {!isPending && pl !== null && (
            <div className={`p-4 rounded-lg ${pl >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <p className="text-xs text-slate-400 mb-0.5">Profit / Loss</p>
              <p className={`text-3xl font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
              </p>
            </div>
          )}

          {/* Bet details grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Sport', value: bet.sport },
              { label: 'Market', value: bet.market },
              { label: 'Bookmaker', value: bet.bookmaker },
              { label: 'Bet Type', value: bet.bet_type },
              { label: 'Odds', value: bet.odds.toString() },
              { label: 'Stake', value: formatCurrency(bet.stake) },
              { label: 'Potential Return', value: formatCurrency(bet.potential_payout) },
              { label: 'Event Date', value: new Date(bet.event_date).toLocaleString() },
              ...(bet.confidence ? [{ label: 'Confidence', value: `${bet.confidence}/5 ⭐` }] : []),
              ...(bet.bet_reference ? [{ label: 'Bet Reference', value: bet.bet_reference }] : []),
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-white font-medium">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Notes */}
          {bet.notes && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-300 bg-slate-800 p-3 rounded-lg">{bet.notes}</p>
            </div>
          )}

          {/* Tags */}
          {bet.tags && bet.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {bet.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs text-slate-400 border-slate-700">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isPending && (
              <>
                <Link href={`/bets/${bet.id}/edit`} className="flex-1">
                  <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Settle Bet
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Settle Bet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-xs">Outcome</Label>
                      <Select onValueChange={setSettleStatus} defaultValue="won">
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {['won','lost','void','cashout','partial_cashout'].map(s => (
                            <SelectItem key={s} value={s} className="text-slate-200 capitalize">
                              {s.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(settleStatus === 'cashout' || settleStatus === 'partial_cashout') && (
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 text-xs">Actual Payout ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={actualPayout}
                          onChange={(e) => setActualPayout(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-slate-200"
                        />
                      </div>
                    )}
                    <Button
                      onClick={settleBet}
                      disabled={settling}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                    >
                      Confirm Settlement
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteBet}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
