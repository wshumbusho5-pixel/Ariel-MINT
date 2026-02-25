'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Eligibility = {
  accountDays: number
  settledBets: number
  roi90: number
  meetsAge: boolean
  meetsBets: boolean
  meetsRoi: boolean
  eligible: boolean
} | null

export function AdvisorSection({
  advisorStatus,
  advisorSpecialty,
  advisorFee,
  advisorSince,
  advisorFlagReason,
  eligibility,
  subscriptionStatus,
}: {
  advisorStatus: string
  advisorSpecialty: string | null
  advisorFee: string | null
  advisorSince: string | null
  advisorFlagReason: string | null
  eligibility: Eligibility
  subscriptionStatus: string
}) {
  const [specialty, setSpecialty] = useState(advisorSpecialty ?? '')
  const [fee, setFee] = useState(advisorFee ?? '')
  const [applying, setApplying] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function saveAdvisorProfile() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ advisor_specialty: specialty || null, advisor_fee: fee || null })
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    if (error) toast.error('Failed to save')
    else toast.success('Advisor profile updated')
    setSaving(false)
  }

  async function applyForAdvisor() {
    setApplying(true)
    const res = await fetch('/api/advisor/apply', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Application failed')
      setApplying(false)
      return
    }
    if (data.checkout_url) {
      window.location.href = data.checkout_url
      return
    }
    toast.success('Advisor status activated!')
    setTimeout(() => window.location.reload(), 1000)
  }

  // Not subscribed
  if (subscriptionStatus === 'trial') {
    return (
      <p className="text-sm text-slate-400">
        Active subscription required to apply for advisor status.{' '}
        <a href="/settings/billing" className="text-emerald-400 hover:text-emerald-300">Upgrade</a>
      </p>
    )
  }

  // Active advisor
  if (advisorStatus === 'active') {
    const since = advisorSince
      ? new Date(advisorSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : null
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">✓ Active Advisor</Badge>
          {since && <span className="text-slate-500 text-xs">since {since}</span>}
        </div>
        <p className="text-xs text-slate-500">
          Your advisor profile is visible in the{' '}
          <a href="/advisors" className="text-emerald-400 hover:text-emerald-300">Advisor Directory</a>.
          Keep your ROI positive to maintain this status.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Specialty (e.g. Football, Value Betting)</label>
            <Input
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              placeholder="Football, Value Betting"
              className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Consultation fee (e.g. $50/session)</label>
            <Input
              value={fee}
              onChange={e => setFee(e.target.value)}
              placeholder="$50/session"
              className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
              maxLength={80}
            />
          </div>
          <Button
            onClick={saveAdvisorProfile}
            disabled={saving}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    )
  }

  // Flagged
  if (advisorStatus === 'flagged') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Flagged
          </Badge>
        </div>
        <p className="text-sm text-amber-300">{advisorFlagReason}</p>
        <p className="text-xs text-slate-500">
          Recover your ROI within 30 days to automatically reinstate your advisor status. If not recovered, your status will be suspended.
        </p>
      </div>
    )
  }

  // Suspended
  if (advisorStatus === 'suspended') {
    return (
      <div className="space-y-2">
        <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Suspended</Badge>
        <p className="text-sm text-red-300">Your advisor status was suspended due to sustained negative ROI.</p>
        <p className="text-xs text-slate-500">
          Build a positive track record and re-apply once you meet the eligibility criteria again.
        </p>
      </div>
    )
  }

  // Eligible — show apply card
  if (eligibility?.eligible) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          You meet the requirements to become a verified advisor. Advisors are listed in the directory and can charge their own consultation fees.
        </p>
        <div className="bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-4 h-4" /> Account age: {eligibility.accountDays} days ✓
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-4 h-4" /> Settled bets: {eligibility.settledBets} ✓
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-4 h-4" /> 90-day ROI: +{eligibility.roi90}% ✓
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Advisor plan is $30/month. Your subscription will be upgraded.
        </p>
        <Button
          onClick={applyForAdvisor}
          disabled={applying}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
        >
          {applying ? 'Applying...' : 'Apply for Advisor Status'}
        </Button>
      </div>
    )
  }

  // Not yet eligible — show progress
  if (eligibility) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-400">Requirements to become a verified advisor:</p>
        <div className="space-y-2 text-sm">
          <div className={`flex items-center gap-2 ${eligibility.meetsAge ? 'text-emerald-400' : 'text-slate-400'}`}>
            {eligibility.meetsAge
              ? <CheckCircle className="w-4 h-4" />
              : <XCircle className="w-4 h-4" />
            }
            Account age: {eligibility.accountDays}/60 days
          </div>
          <div className={`flex items-center gap-2 ${eligibility.meetsBets ? 'text-emerald-400' : 'text-slate-400'}`}>
            {eligibility.meetsBets
              ? <CheckCircle className="w-4 h-4" />
              : <XCircle className="w-4 h-4" />
            }
            Settled bets: {eligibility.settledBets}/100
          </div>
          <div className={`flex items-center gap-2 ${eligibility.meetsRoi ? 'text-emerald-400' : 'text-slate-400'}`}>
            {eligibility.meetsRoi
              ? <CheckCircle className="w-4 h-4" />
              : <XCircle className="w-4 h-4" />
            }
            90-day ROI: {eligibility.roi90 > 0 ? '+' : ''}{eligibility.roi90}% (must be positive)
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          Keep performing and this section will unlock automatically.
        </div>
      </div>
    )
  }

  return null
}
