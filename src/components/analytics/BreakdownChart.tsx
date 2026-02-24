'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

interface BreakdownChartProps {
  title: string
  data: { label: string; pl: number; roi: number }[]
}

export function BreakdownChart({ title, data }: BreakdownChartProps) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="px-5 pt-5 pb-2">
        <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v) => [formatCurrency(v as number), 'P&L']}
              />
              <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
