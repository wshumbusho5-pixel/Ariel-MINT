import { createClient } from '@/lib/supabase/server'
import { BetTable } from '@/components/bets/BetTable'
import { BetFilters } from '@/components/bets/BetFilters'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Camera } from 'lucide-react'

interface SearchParams {
  status?: string
  sport?: string
  page?: string
}

export default async function BetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const params = await searchParams
  const status = params.status ?? 'all'
  const sport = params.sport
  const page = parseInt(params.page ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('bets')
    .select('id, sport, event_name, selection, odds, stake, potential_payout, profit_loss, status, placed_at, bookmaker, bet_type, tags, ocr_source_url', { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('placed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (sport) query = query.eq('sport', sport)

  const { data: bets, count } = await query

  // Get unique sports for filter
  const { data: sportData } = await supabase
    .from('bets')
    .select('sport')
    .eq('user_id', user.id)
    .is('deleted_at', null)

  const uniqueSports = [...new Set(sportData?.map(b => b.sport) ?? [])]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bets</h1>
          <p className="text-slate-400 text-sm mt-0.5">{count ?? 0} total bets tracked</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bets/ocr">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Camera className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Scan Slip</span>
            </Button>
          </Link>
          <Link href="/bets/new">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Bet
            </Button>
          </Link>
        </div>
      </div>

      <BetFilters currentStatus={status} currentSport={sport} sports={uniqueSports} />
      <BetTable bets={bets ?? []} total={count ?? 0} page={page} limit={limit} />
    </div>
  )
}
