import type { Tier } from '@/types/database'

export interface TierDefinition {
  name: Tier
  label: string
  minPoints: number
  color: string
  bgColor: string
  icon: string
  description: string
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    name: 'novice',
    label: 'Novice',
    minPoints: 0,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10 border-slate-500/30',
    icon: '🎯',
    description: 'Just getting started'
  },
  {
    name: 'bronze',
    label: 'Bronze',
    minPoints: 100,
    color: 'text-amber-600',
    bgColor: 'bg-amber-600/10 border-amber-600/30',
    icon: '🥉',
    description: 'Building good habits'
  },
  {
    name: 'silver',
    label: 'Silver',
    minPoints: 300,
    color: 'text-slate-300',
    bgColor: 'bg-slate-300/10 border-slate-300/30',
    icon: '🥈',
    description: 'Showing consistent returns'
  },
  {
    name: 'gold',
    label: 'Gold',
    minPoints: 600,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/30',
    icon: '🥇',
    description: 'Sharp bettor with real edge'
  },
  {
    name: 'platinum',
    label: 'Platinum',
    minPoints: 1000,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10 border-cyan-400/30',
    icon: '💠',
    description: 'Elite-level discipline and returns'
  },
  {
    name: 'elite',
    label: 'Elite',
    minPoints: 2000,
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10 border-violet-400/30',
    icon: '👑',
    description: 'Top 1% — consistent long-term profits'
  },
]

export function getTierDef(tier: Tier): TierDefinition {
  return TIER_DEFINITIONS.find(t => t.name === tier) ?? TIER_DEFINITIONS[0]
}

export function getNextTier(tier: Tier): TierDefinition | null {
  const idx = TIER_DEFINITIONS.findIndex(t => t.name === tier)
  return TIER_DEFINITIONS[idx + 1] ?? null
}

/**
 * Calculate tier points from user performance
 * Points are weighted towards ROI consistency (most important) and discipline
 */
export function calculateTierPoints(stats: {
  totalSettledBets: number
  roiPct: number
  winRate: number
  followedBreakRecommendation: boolean
  madeWithdrawal: boolean
  noLateNightBets30d: boolean
}): number {
  let points = 0

  // Volume points (max 200)
  if (stats.totalSettledBets >= 10) points += 20
  if (stats.totalSettledBets >= 50) points += 50
  if (stats.totalSettledBets >= 100) points += 80
  if (stats.totalSettledBets >= 500) points += 200

  // ROI points (most weighted — max 800)
  if (stats.roiPct > 0) points += 50
  if (stats.roiPct > 5) points += 100
  if (stats.roiPct > 10) points += 200
  if (stats.roiPct > 20) points += 400

  // Discipline points (max 300)
  if (stats.followedBreakRecommendation) points += 100
  if (stats.madeWithdrawal) points += 100
  if (stats.noLateNightBets30d) points += 100

  return points
}
