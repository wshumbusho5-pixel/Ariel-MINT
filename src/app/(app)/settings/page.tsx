import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsForm } from '@/components/shared/SettingsForm'
import { AdvisorSection } from '@/components/settings/AdvisorSection'
import { DigestToggle } from '@/components/settings/DigestToggle'
import { CreditCard, FileText, Award, Mail } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, settingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
  ])

  const profile = profileRes.data

  // Check advisor eligibility (only if not already advisor/flagged/suspended)
  type EligibilityType = {
    accountDays: number; settledBets: number; roi90: number
    meetsAge: boolean; meetsBets: boolean; meetsRoi: boolean; eligible: boolean
  }
  let eligibility: EligibilityType | null = null
  if (profile?.subscription_status === 'active' && profile?.advisor_status === 'none') {
    const accountDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
    const { count: settledCount } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])

    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()
    const { data: recentBets } = await supabase
      .from('bets')
      .select('profit_loss, stake')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])
      .gte('placed_at', ninetyDaysAgo)

    const totalPL = (recentBets ?? []).reduce((s, b) => s + (b.profit_loss ?? 0), 0)
    const totalStake = (recentBets ?? []).reduce((s, b) => s + b.stake, 0)
    const roi90 = totalStake > 0 ? (totalPL / totalStake) * 100 : 0

    eligibility = {
      accountDays,
      settledBets: settledCount ?? 0,
      roi90: Math.round(roi90 * 10) / 10,
      meetsAge: accountDays >= 60,
      meetsBets: (settledCount ?? 0) >= 100,
      meetsRoi: roi90 > 0,
      eligible: accountDays >= 60 && (settledCount ?? 0) >= 100 && roi90 > 0,
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your profile and betting preferences</p>
      </div>

      <SettingsForm profile={profile} settings={settingsRes.data} />

      {/* Email Digest */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DigestToggle
            enabled={profile?.weekly_digest ?? true}
            userId={user.id}
          />
        </CardContent>
      </Card>

      {/* Billing */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Billing & Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-3">
            Plan: <span className="text-white capitalize font-medium">
              {profile?.subscription_status === 'trial'
                ? 'Free Trial'
                : profile?.subscription_tier === 'advisor'
                  ? 'Advisor ($30/month)'
                  : 'Professional ($9/month)'
              }
            </span>
          </p>
          <Link
            href="/settings/billing"
            className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Manage billing →
          </Link>
        </CardContent>
      </Card>

      {/* Tax Report */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tax Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-3">
            Export your betting activity as a CSV for your accountant or self-filing.
          </p>
          <Link
            href="/settings/tax"
            className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Download tax report →
          </Link>
        </CardContent>
      </Card>

      {/* Advisor */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5" />
            Advisor Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdvisorSection
            advisorStatus={profile?.advisor_status ?? 'none'}
            advisorSpecialty={profile?.advisor_specialty ?? null}
            advisorFee={profile?.advisor_fee ?? null}
            advisorSince={profile?.advisor_since ?? null}
            advisorFlagReason={profile?.advisor_flag_reason ?? null}
            eligibility={eligibility}
            subscriptionStatus={profile?.subscription_status ?? 'trial'}
          />
        </CardContent>
      </Card>
    </div>
  )
}
