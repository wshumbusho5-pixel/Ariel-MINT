/**
 * Generates a stable, deterministic anonymous alias from a user ID.
 * The same user always gets the same alias across sessions.
 */
const ADJECTIVES = [
  'Sharp', 'Bold', 'Smart', 'Edge', 'Clean', 'Value', 'Quick', 'Steady',
  'Cool', 'Deep', 'Calm', 'Swift', 'Bright', 'Iron', 'Keen',
]
const NOUNS = [
  'Bettor', 'Punter', 'Capper', 'Trader', 'Analyst', 'Scout', 'Shark',
  'Pro', 'Hunter', 'Eagle', 'Hawk', 'Fox', 'Wolf', 'Lion', 'Ace',
]

export function userAlias(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash = hash & hash
  }
  const h = Math.abs(hash)
  const adj = ADJECTIVES[h % ADJECTIVES.length]
  const noun = NOUNS[Math.floor(h / ADJECTIVES.length) % NOUNS.length]
  const num = (h % 9000) + 1000
  return `${adj}${noun}_${num}`
}
