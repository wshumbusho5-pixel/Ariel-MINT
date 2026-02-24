'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

interface Snapshot {
  snapshot_date: string
  bankroll: number
  daily_pl: number
}

interface BankrollChartProps {
  snapshots: Snapshot[]
  currentBankroll: number
  currency?: string
}

export function BankrollChart({ snapshots, currentBankroll, currency = 'USD' }: BankrollChartProps) {
  const data = snapshots.map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    bankroll: s.bankroll,
    dailyPL: s.daily_pl,
  }))

  // Add today's data point if no snapshot yet
  if (data.length === 0) {
    data.push({ date: 'Today', bankroll: currentBankroll, dailyPL: 0 })
  }

  const isPositiveTrend = data.length < 2 || data[data.length - 1].bankroll >= data[0].bankroll

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="px-6 pt-5 pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
          Bankroll Over Time
          <span className="text-sm font-normal text-slate-400">{data.length} snapshots</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            Place and settle more bets to see your bankroll trend
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bankrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositiveTrend ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isPositiveTrend ? '#10b981' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v, currency)}
                width={80}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: isPositiveTrend ? '#10b981' : '#ef4444' }}
                formatter={(value) => [formatCurrency(value as number, currency), 'Bankroll']}
              />
              <Area
                type="monotone"
                dataKey="bankroll"
                stroke={isPositiveTrend ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fill="url(#bankrollGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
