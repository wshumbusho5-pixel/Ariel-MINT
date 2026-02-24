import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BetDetailView } from '@/components/bets/BetDetailView'

export default async function BetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { id } = await params

  const { data: bet } = await supabase
    .from('bets')
    .select('*, legs:bet_legs(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!bet) notFound()

  return <BetDetailView bet={bet} />
}
