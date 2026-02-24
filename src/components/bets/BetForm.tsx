'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { betSchema, type BetFormData } from '@/lib/validations/bet.schema'
import type { z } from 'zod'
import { parseOdds } from '@/lib/utils/odds'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Loader2, Info } from 'lucide-react'
import type { ParsedBetFields } from '@/types/database'

const SPORTS = ['Football', 'Basketball', 'American Football', 'Tennis', 'Baseball', 'Ice Hockey', 'MMA/Boxing', 'Horse Racing', 'Golf', 'Rugby', 'Cricket', 'Other']
const BOOKMAKERS = ['Bet365', 'DraftKings', 'FanDuel', 'William Hill', 'Betway', 'Betfair', 'Paddy Power', 'Unibet', 'PokerStars', 'BetMGM', 'Other']
const MARKETS = ['Match Result (1X2)', 'Moneyline', 'Over/Under', 'Both Teams to Score', 'Asian Handicap', 'European Handicap', 'First Goal Scorer', 'Anytime Goal Scorer', 'Correct Score', 'Double Chance', 'Draw No Bet', 'Outright/Future', 'Player Props', 'Other']

interface BetFormProps {
  prefill?: ParsedBetFields
  ocrJobId?: string
  editBetId?: string
  currency?: string
}

export function BetForm({ prefill, ocrJobId, editBetId, currency = 'USD' }: BetFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [oddsInput, setOddsInput] = useState(prefill?.odds?.toString() ?? '')
  const [impliedProb, setImpliedProb] = useState<number | null>(null)
  const [potentialPayout, setPotentialPayout] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof betSchema>, unknown, BetFormData>({
    resolver: zodResolver(betSchema),
    defaultValues: {
      sport: prefill?.sport ?? '',
      league: prefill?.league ?? '',
      event_name: prefill?.event_name ?? '',
      event_date: prefill?.event_date ? new Date(prefill.event_date).toISOString().slice(0, 16) : '',
      market: prefill?.market ?? '',
      selection: prefill?.selection ?? '',
      bet_type: prefill?.bet_type ?? 'single',
      bookmaker: prefill?.bookmaker ?? '',
      bet_reference: prefill?.bet_reference ?? '',
      odds: prefill?.odds ?? 0,
      stake: prefill?.stake ?? 0,
      tags: [],
    },
  })

  const stake = watch('stake')

  function handleOddsChange(value: string) {
    setOddsInput(value)
    const decimal = parseOdds(value)
    if (decimal) {
      setValue('odds', decimal)
      setImpliedProb(Math.round((1 / decimal) * 1000) / 10)
      const stakeNum = Number(stake)
      if (stakeNum > 0) setPotentialPayout(Math.round(stakeNum * decimal * 100) / 100)
    } else {
      setImpliedProb(null)
    }
  }

  function handleStakeChange(value: string) {
    const s = parseFloat(value)
    const decimal = parseOdds(oddsInput)
    if (!isNaN(s) && decimal) {
      setPotentialPayout(Math.round(s * decimal * 100) / 100)
    }
  }

  async function onSubmit(data: BetFormData) {
    setLoading(true)
    try {
      const url = editBetId ? `/api/bets/${editBetId}` : '/api/bets'
      const method = editBetId ? 'PATCH' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, ocr_job_id: ocrJobId }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message ?? 'Failed to save bet')
      }

      toast.success(editBetId ? 'Bet updated!' : 'Bet recorded successfully!')
      router.push(editBetId ? `/bets/${editBetId}` : '/bets')
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save bet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Event details */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Event Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Sport *</Label>
              <Select onValueChange={(v) => setValue('sport', v)} defaultValue={prefill?.sport}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {SPORTS.map(s => (
                    <SelectItem key={s} value={s} className="text-slate-200">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sport && <p className="text-xs text-red-400">{errors.sport.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">League / Competition</Label>
              <Input
                placeholder="Premier League, NBA..."
                className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                {...register('league')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Event / Match *</Label>
            <Input
              placeholder="Man Utd vs Arsenal"
              className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
              {...register('event_name')}
            />
            {errors.event_name && <p className="text-xs text-red-400">{errors.event_name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Market *</Label>
              <Select onValueChange={(v) => setValue('market', v)} defaultValue={prefill?.market}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {MARKETS.map(m => (
                    <SelectItem key={m} value={m} className="text-slate-200">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.market && <p className="text-xs text-red-400">{errors.market.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Event Date & Time *</Label>
              <Input
                type="datetime-local"
                className="bg-slate-800 border-slate-700 text-slate-200"
                {...register('event_date')}
              />
              {errors.event_date && <p className="text-xs text-red-400">{errors.event_date.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Your Selection *</Label>
            <Input
              placeholder="Man Utd to win, Over 2.5, Mbappe anytime..."
              className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
              {...register('selection')}
            />
            {errors.selection && <p className="text-xs text-red-400">{errors.selection.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Bet details */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Bet Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Bookmaker *</Label>
              <Select onValueChange={(v) => setValue('bookmaker', v)} defaultValue={prefill?.bookmaker}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select bookmaker" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {BOOKMAKERS.map(b => (
                    <SelectItem key={b} value={b} className="text-slate-200">{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bookmaker && <p className="text-xs text-red-400">{errors.bookmaker.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Bet Type</Label>
              <Select onValueChange={(v) => setValue('bet_type', v as BetFormData['bet_type'])} defaultValue="single">
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['single','double','treble','acca','system','teaser','other'].map(t => (
                    <SelectItem key={t} value={t} className="text-slate-200 capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">
                Odds *
                <span className="ml-1 text-slate-500">(decimal, fractional, or +/-)</span>
              </Label>
              <Input
                placeholder="2.50 or 3/2 or +150"
                className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                value={oddsInput}
                onChange={(e) => handleOddsChange(e.target.value)}
              />
              {impliedProb !== null && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Implied probability: {impliedProb}%
                </p>
              )}
              {errors.odds && <p className="text-xs text-red-400">{errors.odds.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Stake ({currency}) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="50.00"
                className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                {...register('stake')}
                onChange={(e) => {
                  register('stake').onChange(e)
                  handleStakeChange(e.target.value)
                }}
              />
              {potentialPayout !== null && (
                <p className="text-xs text-emerald-400">
                  Potential return: {formatCurrency(potentialPayout, currency)}
                </p>
              )}
              {errors.stake && <p className="text-xs text-red-400">{errors.stake.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Confidence (1–5)</Label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setValue('confidence', n)}
                    className="w-9 h-9 rounded-lg border border-slate-700 text-sm font-medium text-slate-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Bet Reference (optional)</Label>
              <Input
                placeholder="Bookmaker bet ID"
                className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                {...register('bet_reference')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Notes</Label>
            <Textarea
              placeholder="Why you made this bet, any analysis..."
              className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 min-h-[80px]"
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Bet
        </Button>
      </div>
    </form>
  )
}
