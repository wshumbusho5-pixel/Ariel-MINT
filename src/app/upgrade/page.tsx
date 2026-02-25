'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, TrendingUp, FileText, ShieldCheck, Users } from 'lucide-react'

const plans = [
  {
    id: 'regular' as const,
    name: 'Professional',
    price: '$9',
    period: '/month',
    description: 'For serious bettors who want to treat this like a business.',
    features: [
      'Unlimited bet logging',
      'Full analytics + ROI breakdown',
      'Betting Health Score',
      'Tax report CSV export',
      'Monte Carlo projections',
      'Risk engine (10 checks)',
      'Group chat + Direct messages',
      'Leaderboard & rankings',
    ],
    highlight: false,
    badge: null,
  },
  {
    id: 'advisor' as const,
    name: 'Advisor',
    price: '$30',
    period: '/month',
    description: 'For proven bettors who want to share their edge and attract clients.',
    features: [
      'Everything in Professional',
      'Listed in Advisor Directory',
      'Set your own consultation fee',
      'Verified advisor badge on profile',
      'Public performance profile',
      'Performance-based status (auto-maintained)',
    ],
    highlight: true,
    badge: 'By application only',
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function subscribe(plan: 'regular' | 'advisor') {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-sm">
            A
          </div>
          <span className="text-xl font-bold text-white">Ariel MINT</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Treat your betting like a business</h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          Your free trial has ended. Choose a plan to continue — no hidden fees, cancel anytime.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl mb-12">
        {plans.map(plan => (
          <Card
            key={plan.id}
            className={`relative ${plan.highlight
              ? 'bg-emerald-500/5 border-emerald-500/40'
              : 'bg-slate-900 border-slate-800'
            }`}
          >
            {plan.badge && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-xs">
                {plan.badge}
              </Badge>
            )}
            <CardHeader className="pb-3 pt-6">
              <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <p className="text-slate-400 text-sm">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => subscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full font-semibold ${plan.highlight
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {loading === plan.id ? 'Redirecting...' : `Start ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trust indicators */}
      <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500">
        <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Real performance data</span>
        <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Tax-ready reports</span>
        <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Cancel anytime</span>
        <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Verified advisor network</span>
      </div>

      <button
        onClick={() => router.push('/dashboard')}
        className="mt-8 text-xs text-slate-600 hover:text-slate-400 transition-colors"
      >
        Back to app
      </button>
    </div>
  )
}
