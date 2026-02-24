'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ShieldAlert, X, AlertTriangle, Info } from 'lucide-react'

interface AlertData {
  id: string
  alert_type: string
  severity: string
  title: string
  message: string
  created_at: string
}

const SEVERITY_STYLES = {
  critical: 'border-red-500/50 bg-red-500/5',
  warning: 'border-amber-500/50 bg-amber-500/5',
  info: 'border-blue-500/50 bg-blue-500/5',
}

const SEVERITY_ICONS = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
}

const SEVERITY_TITLE_COLORS = {
  critical: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
}

export function RiskAlertBanner({ alerts }: { alerts: AlertData[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()

  async function dismiss(alertId: string) {
    setDismissed(prev => new Set([...prev, alertId]))
    await supabase
      .from('risk_alerts')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', alertId)
    router.refresh()
  }

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      {visible.map(alert => {
        const Icon = SEVERITY_ICONS[alert.severity as keyof typeof SEVERITY_ICONS] ?? ShieldAlert
        const style = SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES] ?? ''
        const titleColor = SEVERITY_TITLE_COLORS[alert.severity as keyof typeof SEVERITY_TITLE_COLORS] ?? 'text-white'

        return (
          <Alert key={alert.id} className={`${style} border relative`}>
            <Icon className={`h-4 w-4 ${titleColor}`} />
            <AlertTitle className={`${titleColor} pr-8`}>{alert.title}</AlertTitle>
            <AlertDescription className="text-slate-300 text-sm mt-1">
              {alert.message}
            </AlertDescription>
            <button
              onClick={() => dismiss(alert.id)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </Alert>
        )
      })}
    </div>
  )
}
