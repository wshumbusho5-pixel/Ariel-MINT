import { createClient } from '@/lib/supabase/server'
import { RiskAlertCard } from '@/components/risk/RiskAlertCard'
import { RiskScoreGauge } from '@/components/risk/RiskScoreGauge'
import { RunRiskCheck } from '@/components/risk/RunRiskCheck'
import { ShieldAlert, CheckCircle } from 'lucide-react'

export default async function RiskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: alerts } = await supabase
    .from('risk_alerts')
    .select('*')
    .eq('user_id', user.id)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: dismissed } = await supabase
    .from('risk_alerts')
    .select('*')
    .eq('user_id', user.id)
    .not('dismissed_at', 'is', null)
    .order('dismissed_at', { ascending: false })
    .limit(10)

  const activeAlerts = alerts ?? []
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length

  // Risk score: 100 is perfect, lower = more risk
  const riskScore = Math.max(0, 100 - criticalCount * 25 - warningCount * 10)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Risk Analysis</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Automated checks that surface patterns you might not notice
          </p>
        </div>
        <RunRiskCheck />
      </div>

      {/* Risk score */}
      <RiskScoreGauge score={riskScore} criticalCount={criticalCount} warningCount={warningCount} />

      {/* Active alerts */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Active Alerts ({activeAlerts.length})
        </h2>

        {activeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
            <p className="text-white font-medium">No active risk alerts</p>
            <p className="text-slate-400 text-sm mt-1">
              Your betting patterns look healthy. Keep tracking to stay ahead.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map(alert => (
              <RiskAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Dismissed alerts */}
      {dismissed && dismissed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Recently Dismissed
          </h2>
          <div className="space-y-2 opacity-50">
            {dismissed.map(alert => (
              <div key={alert.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900">
                <p className="text-sm text-slate-400">{alert.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dismissed {new Date(alert.dismissed_at!).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
