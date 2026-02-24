'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function RunRiskCheck() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function runCheck() {
    setLoading(true)
    try {
      await fetch('/api/risk/run', { method: 'POST' })
      toast.success('Risk check queued — results will appear shortly')
      setTimeout(() => router.refresh(), 3000)
    } catch {
      toast.error('Failed to trigger risk check')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={runCheck}
      disabled={loading}
      className="border-slate-700 text-slate-300 hover:bg-slate-800"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Run Check
    </Button>
  )
}
