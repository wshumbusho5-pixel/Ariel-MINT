import { createClient } from '@/lib/supabase/server'
import { TIER_DEFINITIONS, getTierDef, getNextTier } from '@/lib/tier/definitions'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, Star, Lock } from 'lucide-react'
import { ShareButton } from '@/components/shared/ShareButton'

export default async function RankingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, achievementsRes, allAchievementsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('tier, tier_points, username')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_achievements')
      .select('achievement_id, earned_at, metadata, achievement:achievement_definitions(*)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false }),
    supabase
      .from('achievement_definitions')
      .select('*')
      .order('points', { ascending: true }),
  ])

  const profile = profileRes.data
  const earned = achievementsRes.data ?? []
  const allAchievements = allAchievementsRes.data ?? []

  const earnedIds = new Set(earned.map(e => e.achievement_id))
  const tierDef = getTierDef(profile?.tier ?? 'novice')
  const nextTier = getNextTier(profile?.tier ?? 'novice')
  const points = profile?.tier_points ?? 0
  const progressToNext = nextTier
    ? Math.min(100, ((points - tierDef.minPoints) / (nextTier.minPoints - tierDef.minPoints)) * 100)
    : 100

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rankings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Your tier progress and achievements</p>
        </div>
        <ShareButton />
      </div>

      {/* Current tier */}
      <Card className={`border ${tierDef.bgColor}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{tierDef.icon}</span>
            <div>
              <h2 className={`text-2xl font-bold ${tierDef.color}`}>{tierDef.label}</h2>
              <p className="text-slate-400 text-sm">{tierDef.description}</p>
              <p className="text-slate-500 text-xs mt-0.5">{points} tier points</p>
            </div>
          </div>

          {nextTier ? (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{tierDef.label}</span>
                <span className="flex items-center gap-1">
                  {nextTier.icon} {nextTier.label} — {nextTier.minPoints - points} pts away
                </span>
              </div>
              <Progress value={progressToNext} className="h-2 bg-slate-800" />
            </div>
          ) : (
            <p className="text-sm text-violet-400 font-medium">
              Maximum tier reached — you&apos;re in the top tier!
            </p>
          )}
        </CardContent>
      </Card>

      {/* All tiers */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-white">All Tiers</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TIER_DEFINITIONS.map(tier => {
              const isCurrentOrPast = TIER_DEFINITIONS.findIndex(t => t.name === tier.name) <=
                TIER_DEFINITIONS.findIndex(t => t.name === (profile?.tier ?? 'novice'))
              return (
                <div
                  key={tier.name}
                  className={`p-3 rounded-lg border text-center ${
                    tier.name === profile?.tier
                      ? tier.bgColor
                      : isCurrentOrPast
                      ? 'border-slate-700 bg-slate-800/30'
                      : 'border-slate-800 opacity-40'
                  }`}
                >
                  <div className="text-2xl mb-1">{tier.icon}</div>
                  <p className={`text-sm font-semibold ${isCurrentOrPast ? tier.color : 'text-slate-500'}`}>
                    {tier.label}
                  </p>
                  <p className="text-xs text-slate-500">{tier.minPoints}+ pts</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-400" />
          Achievements ({earned.length}/{allAchievements.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allAchievements.map(achievement => {
            const isEarned = earnedIds.has(achievement.id)
            const earnedData = earned.find(e => e.achievement_id === achievement.id)

            return (
              <div
                key={achievement.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isEarned
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : 'border-slate-800 bg-slate-900 opacity-50'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white">{achievement.name}</p>
                    {isEarned && <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                    {!isEarned && <Lock className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{achievement.description}</p>
                  {isEarned && earnedData && (
                    <p className="text-xs text-yellow-400/70 mt-0.5">
                      Earned {new Date(earnedData.earned_at).toLocaleDateString()}
                    </p>
                  )}
                  {!isEarned && (
                    <p className="text-xs text-slate-500 mt-0.5">{achievement.points} pts on unlock</p>
                  )}
                </div>
                {achievement.tier_req && (
                  <Badge variant="outline" className="text-[10px] py-0 text-slate-500 border-slate-700 flex-shrink-0">
                    {achievement.tier_req}+
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
