'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Bets' },
  { value: 'pending', label: 'Pending' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'void', label: 'Void' },
  { value: 'cashout', label: 'Cashout' },
]

export function BetFilters({
  currentStatus,
  currentSport,
  sports,
}: {
  currentStatus: string
  currentSport?: string
  sports: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('page')
    router.push(`/bets?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex gap-1 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={currentStatus === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('status', opt.value)}
            className={
              currentStatus === opt.value
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-600'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
            }
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {sports.length > 0 && (
        <Select
          value={currentSport ?? 'all'}
          onValueChange={(v) => updateFilter('sport', v)}
        >
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-slate-300">All Sports</SelectItem>
            {sports.map(sport => (
              <SelectItem key={sport} value={sport} className="text-slate-300">{sport}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
