'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { MonteCarloResult } from '@/types/database'

interface MonteCarloChartProps {
  result: MonteCarloResult
  currentBankroll: number
  title: string
}

export function MonteCarloChart({ result, currentBankroll, title }: MonteCarloChartProps) {
  const data = useMemo(() => {
    const p5 = result.percentile_5
    const p25 = result.percentile_25
    const p50 = result.percentile_50
    const p75 = result.percentile_75
    const p95 = result.percentile_95

    // Sample every day (or every Nth day if many days)
    const step = result.projection_days > 30 ? 3 : 1
    const points: { day: string; p5: number; p25: number; p50: number; p75: number; p95: number }[] = []

    for (let i = 0; i <= result.projection_days; i += step) {
      points.push({
        day: i === 0 ? 'Now' : `Day ${i}`,
        p5: p5[i] ?? 0,
        p25: p25[i] ?? 0,
        p50: p50[i] ?? 0,
        p75: p75[i] ?? 0,
        p95: p95[i] ?? 0,
      })
    }

    return points
  }, [result])

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="px-6 pt-5 pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
          {title}
          <span className="text-xs font-normal text-slate-400">Confidence bands</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="p75Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="p25Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              width={60}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value, name) => {
                const labels: Record<string, string> = { p95: 'Best 5%', p75: 'Top 25%', p50: 'Median', p25: 'Bottom 25%', p5: 'Worst 5%' }
                return [formatCurrency(value as number), labels[name as string] ?? name]
              }}
            />
            {/* Outer band (p5-p95) */}
            <Area type="monotone" dataKey="p95" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" fill="url(#p95Grad)" />
            {/* Inner band (p25-p75) */}
            <Area type="monotone" dataKey="p75" stroke="#10b981" strokeWidth={1.5} fill="url(#p75Grad)" />
            {/* Median */}
            <Area type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2.5} fill="none" />
            {/* Lower bands */}
            <Area type="monotone" dataKey="p25" stroke="#f59e0b" strokeWidth={1.5} fill="url(#p25Grad)" />
            <Area type="monotone" dataKey="p5" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" fill="none" />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-4 px-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Median projection</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400/40 inline-block" /> 25th–75th percentile</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block" /> Worst 5%</span>
        </div>
      </CardContent>
    </Card>
  )
}
