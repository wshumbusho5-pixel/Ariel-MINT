import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BetForm } from '@/components/bets/BetForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { ParsedBetFields } from '@/types/database'

export default async function EditBetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { id } = await params

  const [{ data: bet }, { data: profile }] = await Promise.all([
    supabase
      .from('bets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single(),
    supabase.from('profiles').select('currency').eq('id', user.id).single(),
  ])

  if (!bet) notFound()

  // Only pending bets can be edited
  if (bet.status !== 'pending') {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href={`/bets/${id}`}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
        <p className="text-slate-400 text-sm">Only pending bets can be edited.</p>
      </div>
    )
  }

  // Convert bet to prefill format
  const prefill: ParsedBetFields = {
    sport: bet.sport,
    league: bet.league,
    event_name: bet.event_name,
    event_date: bet.event_date,
    market: bet.market,
    selection: bet.selection,
    bet_type: bet.bet_type,
    bookmaker: bet.bookmaker,
    bet_reference: bet.bet_reference,
    odds: bet.odds,
    stake: bet.stake,
    confidence: bet.confidence,
    notes: bet.notes,
    tags: bet.tags,
    placed_at: bet.placed_at,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/bets/${id}`}>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-white">Edit Bet</h1>
      </div>
      <BetForm prefill={prefill} editBetId={id} currency={profile?.currency ?? 'USD'} />
    </div>
  )
}
