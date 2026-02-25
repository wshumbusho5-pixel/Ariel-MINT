import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { TopBar } from '@/components/layout/TopBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, onboarding_done, subscription_status, trial_started_at')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_done && !profile?.username) {
    redirect('/onboarding')
  }

  // Subscription gate: check trial validity or active subscription
  const subStatus = profile?.subscription_status ?? 'trial'
  if (subStatus === 'trial') {
    const { count: betCount } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null)
    const trialStarted = profile?.trial_started_at ? new Date(profile.trial_started_at) : new Date()
    const trialDays = Math.floor((Date.now() - trialStarted.getTime()) / 86400000)
    const trialValid = (betCount ?? 0) < 30 && trialDays < 14
    if (!trialValid) redirect('/upgrade')
  } else if (subStatus === 'canceled' || subStatus === 'past_due') {
    redirect('/upgrade')
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar username={profile?.username ?? user.email ?? 'User'} userId={user.id} />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
