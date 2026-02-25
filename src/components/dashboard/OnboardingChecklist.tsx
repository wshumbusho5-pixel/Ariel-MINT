'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, ArrowRight, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  description: string
  done: boolean
  href: string
}

interface Props {
  userId: string
  hasFirstBet: boolean
  hasSettledBet: boolean
  hasVerifiedBet: boolean
  hasRiskAlert: boolean
  isPublic: boolean
}

export function OnboardingChecklist({
  userId,
  hasFirstBet,
  hasSettledBet,
  hasVerifiedBet,
  hasRiskAlert,
  isPublic,
}: Props) {
  const [dismissed, setDismissed] = useState(false)
  const supabase = createClient()

  const steps: Step[] = [
    {
      label: 'Log your first bet',
      description: 'Add a bet manually or scan a slip',
      done: hasFirstBet,
      href: '/bets/new',
    },
    {
      label: 'Settle a bet',
      description: 'Mark a bet as won, lost, or cashed out',
      done: hasSettledBet,
      href: '/bets',
    },
    {
      label: 'Scan a betting slip',
      description: 'Use OCR to import a bet from a photo',
      done: hasVerifiedBet,
      href: '/bets/ocr',
    },
    {
      label: 'Run your risk analysis',
      description: 'Check for tilt, streaks, and danger patterns',
      done: hasRiskAlert,
      href: '/risk',
    },
    {
      label: 'Make your profile public',
      description: 'Share your track record and appear in rankings',
      done: isPublic,
      href: '/settings',
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length

  async function dismiss() {
    setDismissed(true)
    await supabase.from('profiles').update({ onboarding_done: true }).eq('id', userId)
  }

  if (dismissed) return null

  return (
    <Card className={cn(
      'border transition-colors',
      allDone
        ? 'bg-emerald-500/5 border-emerald-500/30'
        : 'bg-slate-900 border-slate-800'
    )}>
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Rocket className="w-4 h-4 text-emerald-400" />
            {allDone ? "You're all set!" : 'Get started'}
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    s.done ? 'bg-emerald-400' : 'bg-slate-700'
                  )}
                />
              ))}
              <span className="text-xs text-slate-500 ml-1">{doneCount}/{steps.length}</span>
            </div>
            <button
              onClick={dismiss}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {allDone ? 'Dismiss' : 'Skip'}
            </button>
          </div>
        </div>
        {!allDone && (
          <p className="text-xs text-slate-500 mt-0.5">
            Complete these steps to get the most out of Ariel MINT
          </p>
        )}
        {allDone && (
          <p className="text-sm text-slate-400 mt-0.5">
            You've completed all setup steps. Your account is fully configured.
          </p>
        )}
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors',
                step.done
                  ? 'opacity-60'
                  : 'hover:bg-slate-800/60 cursor-pointer'
              )}
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-600 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  step.done ? 'text-slate-400 line-through' : 'text-white'
                )}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-slate-500">{step.description}</p>
                )}
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="flex-shrink-0 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Go <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
