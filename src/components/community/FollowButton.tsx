'use client'

import { useState } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FollowButton({
  targetId,
  initialFollowing,
}: {
  targetId: string
  initialFollowing: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: targetId }),
      })
      if (res.ok) {
        const data = await res.json()
        setFollowing(data.following)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
        following
          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
      )}
    >
      {following ? (
        <><UserCheck className="w-3.5 h-3.5" /> Following</>
      ) : (
        <><UserPlus className="w-3.5 h-3.5" /> Follow</>
      )}
    </button>
  )
}
