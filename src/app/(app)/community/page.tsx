import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FollowButton } from '@/components/community/FollowButton'
import Link from 'next/link'
import { Globe, MapPin, MessageCircle, Users } from 'lucide-react'
import { userAlias } from '@/lib/utils/alias'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // My profile (for country comparison)
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('country')
    .eq('id', user.id)
    .single()

  // All public profiles (excluding self)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, tier, country, created_at')
    .eq('is_public', true)
    .neq('id', user.id)

  // Who I'm following
  const { data: myFollows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  // Who follows me back (for mutual detection)
  const { data: followersOfMe } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', user.id)

  const followingSet = new Set(myFollows?.map(f => f.following_id) ?? [])
  const followersSet = new Set(followersOfMe?.map(f => f.follower_id) ?? [])

  const myCountry = myProfile?.country ?? null

  // Build cards, sort: same country first, then by join date desc
  const cards = (profiles ?? [])
    .map(p => ({
      ...p,
      alias: userAlias(p.id),
      isFollowing: followingSet.has(p.id),
      isMutual: followingSet.has(p.id) && followersSet.has(p.id),
      sameCountry: myCountry && p.country === myCountry,
      memberSince: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    }))
    .sort((a, b) => {
      // Same country first
      if (a.sameCountry && !b.sameCountry) return -1
      if (!a.sameCountry && b.sameCountry) return 1
      // Then newest first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const nearbyCount = cards.filter(c => c.sameCountry).length

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Globe className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Community</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Discover bettors on the platform · all identities are anonymous until you follow each other
          </p>
        </div>
      </div>

      {myCountry && nearbyCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>{nearbyCount} bettors near you in <span className="text-white font-medium">{myCountry}</span> shown first</span>
        </div>
      )}

      {!myCountry && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-400">
          Add your country in{' '}
          <Link href="/settings" className="text-emerald-400 hover:text-emerald-300 font-medium">Settings</Link>
          {' '}to see bettors near you first.
        </div>
      )}

      {cards.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No public users yet.</p>
            <p className="text-slate-500 text-sm mt-1">
              Be the first — enable Public Profile in Settings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cards.map(card => (
            <Card
              key={card.id}
              className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm flex-shrink-0">
                      {card.alias[0]}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">{card.alias}</span>
                        {card.isMutual && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                            Mutual
                          </Badge>
                        )}
                        {card.sameCountry && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">
                            <MapPin className="w-2.5 h-2.5 mr-0.5" />
                            Near you
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {card.tier} · Member since {card.memberSince}
                        {card.country && ` · ${card.country}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <FollowButton targetId={card.id} initialFollowing={card.isFollowing} />
                    <Link
                      href={`/messages?new=${card.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Message</span>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-600 text-center">
        Aliases are randomly assigned and stable — the same person always has the same alias.
        After you both follow each other, real usernames are revealed in your messages.
      </p>
    </div>
  )
}
