'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Banknote, Plus, Check, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { WithdrawalTarget } from '@/types/database'

export function WithdrawalManager({
  targets,
  userId,
  currency,
  currentProfit,
}: {
  targets: WithdrawalTarget[]
  userId: string
  currency?: string
  currentProfit: number
}) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  async function addTarget() {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid target amount')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('withdrawal_targets').insert({
      user_id: userId,
      target_type: 'fixed_profit',
      target_amount: parseFloat(amount),
      description: description || null,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Withdrawal target set!')
      setShowForm(false)
      setAmount('')
      setDescription('')
      router.refresh()
    }
    setLoading(false)
  }

  async function markFulfilled(id: string) {
    await supabase
      .from('withdrawal_targets')
      .update({ fulfilled_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
    toast.success('Withdrawal target fulfilled!')
    router.refresh()
  }

  async function deleteTarget(id: string) {
    await supabase.from('withdrawal_targets').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" />
              Withdrawal Targets
            </span>
            <Button
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Target
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {showForm && (
            <div className="p-4 bg-slate-800 rounded-lg mb-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Profit Target ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200"
                />
                <p className="text-xs text-slate-500">You&apos;ll get alerted when your profit reaches this amount</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Label (optional)</Label>
                <Input
                  placeholder="e.g. Monthly extraction"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addTarget} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
                  Set Target
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {targets.filter(t => t.is_active).length === 0 && !showForm ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No targets set yet. Add one to get withdrawal reminders.
            </div>
          ) : (
            <div className="space-y-3">
              {targets.filter(t => t.is_active).map(target => {
                const progress = target.target_amount
                  ? Math.min(100, (currentProfit / target.target_amount) * 100)
                  : 0
                const reached = currentProfit >= (target.target_amount ?? Infinity)

                return (
                  <div
                    key={target.id}
                    className={`p-4 rounded-lg border ${reached ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {formatCurrency(target.target_amount ?? 0, currency)} target
                        </p>
                        {target.description && (
                          <p className="text-xs text-slate-400">{target.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {reached && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                            Reached!
                          </Badge>
                        )}
                        <button onClick={() => markFulfilled(target.id)} className="text-slate-500 hover:text-emerald-400 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteTarget(target.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${reached ? 'bg-emerald-400' : 'bg-emerald-500/50'}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatCurrency(Math.max(0, currentProfit), currency)} / {formatCurrency(target.target_amount ?? 0, currency)} ({progress.toFixed(0)}%)
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
