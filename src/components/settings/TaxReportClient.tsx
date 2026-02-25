'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Info } from 'lucide-react'

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

export function TaxReportClient({
  currentYear,
  betCount,
  totalStake,
  totalWinnings,
  netPL,
}: {
  currentYear: number
  betCount: number
  totalStake: number
  totalWinnings: number
  netPL: number
}) {
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(false)

  async function downloadCSV() {
    setLoading(true)
    try {
      const res = await fetch(`/api/tax/report?year=${year}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ariel-mint-tax-${year}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Tax Report</h1>
        <p className="text-slate-400 text-sm mt-0.5">Export your betting activity for tax purposes</p>
      </div>

      {/* Year selector + summary */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {year} Summary
            </CardTitle>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-white">{betCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Settled Bets</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-white">{totalStake.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Staked</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-400">{totalWinnings.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Winnings</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netPL >= 0 ? '+' : ''}{netPL.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Net P&L</p>
            </div>
          </div>

          <Button
            onClick={downloadCSV}
            disabled={loading || betCount === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Preparing...' : `Download ${year} CSV`}
          </Button>

          {betCount === 0 && (
            <p className="text-xs text-center text-slate-500">No settled bets found for {year}.</p>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-400">Tax rules vary by country</p>
              <p>🇺🇸 US: Gambling winnings are taxable income. Losses can offset winnings if you itemize deductions.</p>
              <p>🇬🇧 UK: Betting winnings are generally not taxable for recreational bettors.</p>
              <p>🇦🇺 AU: Generally not taxable unless you're a professional gambler.</p>
              <p>🇿🇦 ZA: Betting winnings generally not taxable.</p>
              <p className="pt-1">Always consult a qualified tax professional in your jurisdiction. This report is for reference only.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
