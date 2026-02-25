'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { HonestyMetrics } from '@/lib/analytics/honestyEngine'
import {
  TrendingUp, TrendingDown, AlertTriangle, Brain,
  BedDouble, CheckCircle, Activity, Flame,
} from 'lucide-react'

function StatRow({
  label, value, sub, positive,
}: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
      <p className="text-sm text-slate-400">{label}</p>
      <div className="text-right">
        <p className={`text-sm font-semibold ${
          positive === undefined ? 'text-white' :
          positive ? 'text-emerald-400' : 'text-red-400'
        }`}>{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

const CONFIDENCE_CONFIG = {
  insufficient: { label: 'Insufficient data', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  low: { label: 'Low confidence', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  moderate: { label: 'Moderate confidence', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  high: { label: 'High confidence', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
}

export function HonestyReport({ metrics, currency }: { metrics: HonestyMetrics; currency: string }) {
  const { edge, confidenceLevel, skillConfidence, sampleSize } = metrics
  const hasEdge = edge > 0
  const isInsufficient = confidenceLevel === 'insufficient'
  const confConfig = CONFIDENCE_CONFIG[confidenceLevel]

  // Streak description
  const streakLen = Math.abs(metrics.currentStreak)
  const streakType = metrics.currentStreak > 0 ? 'win' : 'loss'
  const streakPct = Math.round(metrics.currentStreakProbability * 100 * 10) / 10

  return (
    <div className="space-y-4">
      {/* Verdict card */}
      <Card className={`border ${
        isInsufficient ? 'bg-slate-900 border-slate-800' :
        hasEdge ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Your Edge</p>

              <div className="flex items-baseline gap-3 mb-2">
                <span className={`text-5xl font-bold tracking-tight ${
                  isInsufficient ? 'text-slate-400' :
                  hasEdge ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {edge >= 0 ? '+' : ''}{edge}%
                </span>
                <Badge className={confConfig.color}>{confConfig.label}</Badge>
              </div>

              <p className="text-slate-300 text-sm">
                {isInsufficient
                  ? `You need at least 50 settled bets for meaningful analysis. You have ${sampleSize}.`
                  : hasEdge
                    ? `Your bets win ${edge}% more often than your odds imply. Based on ${sampleSize} bets, there's a ${skillConfidence}% chance this is genuine skill.`
                    : `Your bets win ${Math.abs(edge)}% less often than your odds imply. You are losing long-term even when recent results look good.`
                }
              </p>

              {!isInsufficient && (
                <p className="text-xs text-slate-500 mt-2">
                  Skill confidence: {skillConfidence}% · p-value: {metrics.pValue} · z-score: {metrics.zScore}
                </p>
              )}
            </div>

            <div className="flex-shrink-0">
              {isInsufficient
                ? <Activity className="w-10 h-10 text-slate-600" />
                : hasEdge
                  ? <TrendingUp className="w-10 h-10 text-emerald-400" />
                  : <TrendingDown className="w-10 h-10 text-red-400" />
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rest recommendation */}
      {metrics.restRecommended && (
        <Card className="bg-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <BedDouble className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 font-semibold text-sm">Rest Recommended</p>
              <p className="text-slate-300 text-sm mt-0.5">
                Your last 14 days ({metrics.last14DayROI >= 0 ? '+' : ''}{metrics.last14DayROI}% ROI) are{' '}
                {Math.abs(metrics.recentFormDelta).toFixed(1)}% below your overall average ({metrics.overallROI >= 0 ? '+' : ''}{metrics.overallROI}% ROI).
                A short break before your next bet is advised.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Expected vs Actual */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-slate-400" />
              Expected vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <StatRow
              label="Expected win rate"
              value={`${metrics.expectedWinRate}%`}
              sub="Based on your average odds"
            />
            <StatRow
              label="Actual win rate"
              value={`${metrics.actualWinRate}%`}
              positive={metrics.actualWinRate >= metrics.expectedWinRate}
            />
            <StatRow
              label="Expected yield"
              value={`${metrics.expectedYield >= 0 ? '+' : ''}${metrics.expectedYield}%`}
              sub="Typical bookmaker margin"
              positive={metrics.expectedYield >= 0}
            />
            <StatRow
              label="Actual yield"
              value={`${metrics.actualYield >= 0 ? '+' : ''}${metrics.actualYield}%`}
              positive={metrics.actualYield >= 0}
            />
          </CardContent>
        </Card>

        {/* Break-even + Form */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              Business Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <StatRow
              label="Average odds"
              value={metrics.currentAvgOdds.toFixed(2)}
              sub="Decimal"
            />
            <StatRow
              label="Break-even odds"
              value={metrics.breakEvenOdds.toFixed(2)}
              sub="Min odds needed at your win rate"
              positive={metrics.currentAvgOdds >= metrics.breakEvenOdds}
            />
            <StatRow
              label="Overall ROI"
              value={`${metrics.overallROI >= 0 ? '+' : ''}${metrics.overallROI}%`}
              positive={metrics.overallROI >= 0}
            />
            <StatRow
              label="Last 14 days ROI"
              value={`${metrics.last14DayROI >= 0 ? '+' : ''}${metrics.last14DayROI}%`}
              sub={`${metrics.last14DayBets} bets`}
              positive={metrics.last14DayROI >= 0}
            />
            <StatRow
              label="Verified slips"
              value={`${metrics.verifiedPct}%`}
              sub={`${metrics.verifiedCount} of ${metrics.sampleSize} bets`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Streak context */}
      {streakLen >= 2 && (
        <Card className={`border ${
          metrics.currentStreak > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900 border-slate-800'
        }`}>
          <CardContent className="p-4 flex items-start gap-3">
            {metrics.currentStreak > 0
              ? <Flame className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            }
            <div>
              <p className="text-sm font-semibold text-white">
                {streakLen}-{streakType} streak
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                {streakPct < 5
                  ? `This streak has only a ${streakPct}% chance of happening by luck. Strong signal.`
                  : streakPct < 20
                    ? `This streak has a ${streakPct}% probability of being pure variance.`
                    : `This streak has a ${streakPct}% probability of being variance — don't read too much into it.`
                }
              </p>
            </div>
            {streakPct < 5 && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
          </CardContent>
        </Card>
      )}

      {/* Sample size context */}
      {sampleSize < 300 && (
        <p className="text-xs text-slate-600 text-center">
          {sampleSize < 50 ? `${50 - sampleSize} more settled bets needed for analysis.` :
           sampleSize < 150 ? `${150 - sampleSize} more bets for moderate confidence.` :
           `${300 - sampleSize} more bets for high confidence.`}
        </p>
      )}
    </div>
  )
}
