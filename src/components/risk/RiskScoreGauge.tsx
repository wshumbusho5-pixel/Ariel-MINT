'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react'

export function RiskScoreGauge({
  score,
  criticalCount,
  warningCount,
}: {
  score: number
  criticalCount: number
  warningCount: number
}) {
  const isGood = score >= 80
  const isOk = score >= 50 && score < 80
  const isBad = score < 50

  return (
    <Card className={`border ${isBad ? 'border-red-500/40 bg-red-500/5' : isOk ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5'}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle
                cx="60" cy="60" r="50"
                fill="none" stroke="#1e293b" strokeWidth="12"
              />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke={isBad ? '#ef4444' : isOk ? '#f59e0b' : '#10b981'}
                strokeWidth="12"
                strokeDasharray={`${(score / 100) * 314} 314`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${isBad ? 'text-red-400' : isOk ? 'text-amber-400' : 'text-emerald-400'}`}>
                {score}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              {isBad ? <ShieldAlert className="w-5 h-5 text-red-400" /> :
               isOk ? <Shield className="w-5 h-5 text-amber-400" /> :
               <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              <p className="font-semibold text-white text-lg">
                {isBad ? 'High Risk' : isOk ? 'Moderate Risk' : 'Healthy'}
              </p>
            </div>
            <p className={`text-sm ${isBad ? 'text-red-300' : isOk ? 'text-amber-300' : 'text-emerald-300'}`}>
              {isBad ? 'Multiple serious risk patterns detected' :
               isOk ? 'Some areas need attention' :
               'Your betting patterns look healthy'}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-slate-400">
              <span>{criticalCount} critical</span>
              <span>{warningCount} warnings</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
