'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function DigestToggle({ enabled, userId }: { enabled: boolean; userId: string }) {
  const [on, setOn] = useState(enabled)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function toggle() {
    const next = !on
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ weekly_digest: next })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      toast.error('Failed to update preference')
    } else {
      setOn(next)
      toast.success(next ? 'Weekly digest enabled' : 'Weekly digest disabled')
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">Weekly email digest</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Sent every Monday — your week in bets, P&amp;L, and top picks
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
          on ? 'bg-emerald-500' : 'bg-slate-700'
        }`}
        aria-label={on ? 'Disable weekly digest' : 'Enable weekly digest'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
