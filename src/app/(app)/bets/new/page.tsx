import { createClient } from '@/lib/supabase/server'
import { BetForm } from '@/components/bets/BetForm'

export default async function NewBetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('currency').eq('id', user.id).single()
    : { data: null }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Add Bet</h1>
        <p className="text-slate-400 text-sm mt-0.5">Record a new bet manually</p>
      </div>
      <BetForm currency={profile?.currency ?? 'USD'} />
    </div>
  )
}
