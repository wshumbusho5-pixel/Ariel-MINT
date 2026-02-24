'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, AlertTriangle, Info, X, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { RiskAlert } from '@/types/database'

const SEVERITY_STYLES = {
  critical: { card: 'border-red-500/40', badge: 'bg-red-500/10 text-red-400 border-red-500/30', icon: ShieldAlert, iconColor: 'text-red-400' },
  warning: { card: 'border-amber-500/40', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: AlertTriangle, iconColor: 'text-amber-400' },
  info: { card: 'border-blue-500/40', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Info, iconColor: 'text-blue-400' },
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  tilt_detection: 'Tilt',
  concentration_risk: 'Concentration',
  losing_streak: 'Losing Streak',
  drawdown_alert: 'Drawdown',
  late_night_betting: 'Late Night',
  rapid_betting: 'Rapid Betting',
  odds_bias: 'Odds Bias',
  correlation_risk: 'Correlation',
  monthly_trend_degradation: 'Trend',
  ev_variance_mismatch: 'Variance',
}

export function RiskAlertCard({ alert }: { alert: RiskAlert }) {
  const [dismissing, setDismissing] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info
  const Icon = styles.icon

  async function dismiss() {
    setDismissing(true)
    await supabase
      .from('risk_alerts')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', alert.id)
    toast.success('Alert dismissed')
    router.refresh()
  }

  return (
    <Card className={`bg-slate-900 border ${styles.card}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white">{alert.title}</p>
              <div className="flex gap-1.5">
                <Badge variant="outline" className={`text-[10px] py-0 ${styles.badge}`}>
                  {alert.severity}
                </Badge>
                <Badge variant="outline" className="text-[10px] py-0 text-slate-400 border-slate-700">
                  {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{alert.message}</p>
            <p className="text-xs text-slate-500 mt-2">
              {new Date(alert.created_at).toLocaleString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            disabled={dismissing}
            className="flex-shrink-0 text-slate-400 hover:text-white h-8 w-8 p-0"
          >
            {dismissing ? <CheckCheck className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
