'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileBarChart } from 'lucide-react'
import type { MonthlyPL } from '@/lib/analytics/honestyEngine'
import { formatCurrency } from '@/lib/utils/currency'

export function MonthlyStatement({ months, currency }: { months: MonthlyPL[]; currency: string }) {
  if (months.length === 0) return null

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <FileBarChart className="w-4 h-4 text-slate-400" />
          Monthly P&L Statement
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">Your betting business — month by month</p>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800">
                <th className="text-left pb-2 font-medium">Month</th>
                <th className="text-right pb-2 font-medium">Bets</th>
                <th className="text-right pb-2 font-medium">Staked</th>
                <th className="text-right pb-2 font-medium">Net P&L</th>
                <th className="text-right pb-2 font-medium">ROI</th>
                <th className="text-right pb-2 font-medium">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.month} className="border-b border-slate-800/50 last:border-0">
                  <td className="py-2.5 text-white font-medium">{m.monthLabel}</td>
                  <td className="py-2.5 text-right text-slate-400">{m.betCount}</td>
                  <td className="py-2.5 text-right text-slate-400">{formatCurrency(m.staked, currency)}</td>
                  <td className={`py-2.5 text-right font-semibold ${m.netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.netPL >= 0 ? '+' : ''}{formatCurrency(m.netPL, currency)}
                  </td>
                  <td className={`py-2.5 text-right ${m.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.roi >= 0 ? '+' : ''}{m.roi}%
                  </td>
                  <td className="py-2.5 text-right text-slate-400">
                    {m.settledCount > 0 ? `${m.winRate}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700">
                <td className="pt-3 text-xs text-slate-500 font-medium uppercase">Total</td>
                <td className="pt-3 text-right text-slate-400 text-xs">
                  {months.reduce((s, m) => s + m.betCount, 0)}
                </td>
                <td className="pt-3 text-right text-slate-400 text-xs">
                  {formatCurrency(months.reduce((s, m) => s + m.staked, 0), currency)}
                </td>
                <td className={`pt-3 text-right text-xs font-semibold ${
                  months.reduce((s, m) => s + m.netPL, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {(() => {
                    const total = months.reduce((s, m) => s + m.netPL, 0)
                    return `${total >= 0 ? '+' : ''}${formatCurrency(total, currency)}`
                  })()}
                </td>
                <td className={`pt-3 text-right text-xs ${
                  (() => {
                    const totalStake = months.reduce((s, m) => s + m.staked, 0)
                    const totalPL = months.reduce((s, m) => s + m.netPL, 0)
                    return totalStake > 0 ? totalPL / totalStake * 100 >= 0 : false
                  })() ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {(() => {
                    const totalStake = months.reduce((s, m) => s + m.staked, 0)
                    const totalPL = months.reduce((s, m) => s + m.netPL, 0)
                    const roi = totalStake > 0 ? Math.round(totalPL / totalStake * 10000) / 100 : 0
                    return `${roi >= 0 ? '+' : ''}${roi}%`
                  })()}
                </td>
                <td className="pt-3" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {months.map(m => (
            <div key={m.month} className="bg-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{m.monthLabel}</span>
                <span className={`text-sm font-bold ${m.netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {m.netPL >= 0 ? '+' : ''}{formatCurrency(m.netPL, currency)}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>{m.betCount} bets</span>
                <span>Staked: {formatCurrency(m.staked, currency)}</span>
                <span className={m.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {m.roi >= 0 ? '+' : ''}{m.roi}% ROI
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
