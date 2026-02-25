'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type BillingProfile = {
  subscription_status: string
  subscription_tier: string
  sub_period_end: string | null
  trial_started_at: string
  stripe_customer_id: string | null
}

const STATUS_CONFIG = {
  trial: { label: 'Free Trial', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Clock },
  active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  past_due: { label: 'Payment Due', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: AlertCircle },
  canceled: { label: 'Canceled', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: AlertCircle },
}

export default function BillingPage() {
  const [profile, setProfile] = useState<BillingProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles')
      .select('subscription_status, subscription_tier, sub_period_end, trial_started_at, stripe_customer_id')
      .single()
      .then(({ data }) => setProfile(data))
  }, [])

  async function openPortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  async function subscribe(plan: 'regular' | 'advisor') {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = profile
    ? (STATUS_CONFIG[profile.subscription_status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.canceled)
    : null
  const StatusIcon = statusConfig?.icon ?? Clock

  const periodEnd = profile?.sub_period_end
    ? new Date(profile.sub_period_end).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const trialDays = profile
    ? Math.max(0, 14 - Math.floor((Date.now() - new Date(profile.trial_started_at).getTime()) / 86400000))
    : null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your plan and payment method</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!profile ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium capitalize">
                    {profile.subscription_status === 'trial'
                      ? 'Free Trial'
                      : profile.subscription_tier === 'advisor'
                        ? 'Advisor — $30/month'
                        : 'Professional — $9/month'
                    }
                  </p>
                  {profile.subscription_status === 'trial' && trialDays !== null && (
                    <p className="text-sm text-slate-400">{trialDays} days remaining in trial</p>
                  )}
                  {periodEnd && profile.subscription_status === 'active' && (
                    <p className="text-sm text-slate-400">Renews {periodEnd}</p>
                  )}
                  {periodEnd && profile.subscription_status === 'canceled' && (
                    <p className="text-sm text-slate-400">Access until {periodEnd}</p>
                  )}
                </div>
                {statusConfig && (
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {profile.subscription_status === 'active' && profile.stripe_customer_id && (
                  <Button
                    onClick={openPortal}
                    disabled={loading}
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    {loading ? 'Loading...' : 'Manage Billing'}
                  </Button>
                )}
                {(profile.subscription_status === 'trial' || profile.subscription_status === 'canceled') && (
                  <Button
                    onClick={() => subscribe('regular')}
                    disabled={loading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                  >
                    {loading ? 'Loading...' : 'Subscribe — $9/month'}
                  </Button>
                )}
                {profile.subscription_status === 'past_due' && profile.stripe_customer_id && (
                  <Button
                    onClick={openPortal}
                    disabled={loading}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
                  >
                    {loading ? 'Loading...' : 'Update Payment Method'}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-slate-600 text-center">
        Payments processed securely by Stripe. Cancel anytime — no lock-in.
      </div>
    </div>
  )
}
