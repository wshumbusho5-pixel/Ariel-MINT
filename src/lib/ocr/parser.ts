import { detectBookmaker } from './bookmakerTemplates'
import { parseOdds, americanToDecimal } from '@/lib/utils/odds'
import type { ParsedBetFields } from '@/types/database'

/**
 * Parse raw OCR text into structured bet fields
 */
export function parseBetSlip(fullText: string): ParsedBetFields {
  const text = fullText
  const template = detectBookmaker(text)
  const result: ParsedBetFields = {}
  const confidenceScores: Record<string, number> = {}

  // ─── BOOKMAKER ─────────────────────────────────────────────
  if (template) {
    result.bookmaker = template.name
    confidenceScores.bookmaker = 0.95
  } else {
    // Try to extract from text
    const bookMatch = text.match(/(?:via|with|from)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/m)
    if (bookMatch) {
      result.bookmaker = bookMatch[1]
      confidenceScores.bookmaker = 0.4
    }
  }

  // ─── ODDS ───────────────────────────────────────────────────
  const oddsPatterns = [
    ...(template?.patterns.odds ?? []),
    // Generic patterns
    /odds[:\s]+([+-]?\d+\.?\d*|\d+\/\d+)/i,
    /@ ([+-]?\d+\.?\d*)/,
    /price[:\s]+([+-]?\d+\.?\d*|\d+\/\d+)/i,
    /([+-]\d{3,4})\b/,  // American odds
  ]

  for (const pattern of oddsPatterns) {
    const match = text.match(pattern)
    if (match) {
      const parsed = parseOdds(match[1])
      if (parsed && parsed > 1) {
        result.odds = parsed
        confidenceScores.odds = template?.patterns.odds?.includes(pattern) ? 0.9 : 0.6
        break
      }
    }
  }

  // ─── STAKE ──────────────────────────────────────────────────
  const stakePatterns = [
    ...(template?.patterns.stake ?? []),
    /(?:stake|bet|wager)[:\s]+(?:\$|£|€)?(\d+(?:\.\d{1,2})?)/i,
    /(?:\$|£|€)\s*(\d+(?:\.\d{1,2})?)/,
  ]

  for (const pattern of stakePatterns) {
    const match = text.match(pattern)
    if (match) {
      const stake = parseFloat(match[1])
      if (!isNaN(stake) && stake > 0) {
        result.stake = stake
        confidenceScores.stake = template?.patterns.stake?.includes(pattern) ? 0.85 : 0.6
        break
      }
    }
  }

  // ─── DATE ───────────────────────────────────────────────────
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\w+ \d{1,2},?\s*\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      try {
        const date = new Date(match[1])
        if (!isNaN(date.getTime())) {
          result.event_date = date.toISOString()
          confidenceScores.event_date = 0.7
          break
        }
      } catch {
        continue
      }
    }
  }

  // ─── BET REFERENCE ──────────────────────────────────────────
  const refPatterns = [
    ...(template?.patterns.betReference ?? []),
    /(?:bet|ref|id|ticket)[:\s#]+([A-Z0-9-]{6,20})/i,
  ]

  for (const pattern of refPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.bet_reference = match[1]
      confidenceScores.bet_reference = 0.8
      break
    }
  }

  // ─── BET TYPE ───────────────────────────────────────────────
  const lowerText = text.toLowerCase()
  if (/\b(acca|accumulator|parlay)\b/.test(lowerText)) {
    result.bet_type = 'acca'
    confidenceScores.bet_type = 0.9
  } else if (/\bdouble\b/.test(lowerText)) {
    result.bet_type = 'double'
    confidenceScores.bet_type = 0.85
  } else if (/\btreble\b/.test(lowerText)) {
    result.bet_type = 'treble'
    confidenceScores.bet_type = 0.85
  } else if (/\bsingle\b/.test(lowerText)) {
    result.bet_type = 'single'
    confidenceScores.bet_type = 0.9
  }

  // ─── SPORT DETECTION ────────────────────────────────────────
  const sports: [RegExp, string][] = [
    [/\b(soccer|football|premier league|la liga|bundesliga|serie a|champions league|epl)\b/i, 'Football'],
    [/\b(basketball|nba|wnba|ncaa basketball)\b/i, 'Basketball'],
    [/\b(american football|nfl|ncaa football)\b/i, 'American Football'],
    [/\b(tennis|atp|wta|wimbledon|us open)\b/i, 'Tennis'],
    [/\b(baseball|mlb)\b/i, 'Baseball'],
    [/\b(ice hockey|nhl|hockey)\b/i, 'Ice Hockey'],
    [/\b(mma|ufc|boxing)\b/i, 'MMA/Boxing'],
    [/\b(horse racing|racing|derby)\b/i, 'Horse Racing'],
  ]

  for (const [pattern, sport] of sports) {
    if (pattern.test(text)) {
      result.sport = sport
      confidenceScores.sport = 0.8
      break
    }
  }

  result.confidence_scores = confidenceScores

  // Overall confidence: average of available field scores
  const scores = Object.values(confidenceScores)
  const avgConfidence = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
    : 0

  return result
}

/**
 * Score the overall confidence of a parsed result (0–100)
 */
export function getParseConfidence(fields: ParsedBetFields): number {
  const scores = Object.values(fields.confidence_scores ?? {})
  if (scores.length === 0) return 0

  // Weight critical fields higher
  const criticalFields = ['odds', 'stake', 'bookmaker']
  let weighted = 0
  let totalWeight = 0

  for (const [field, score] of Object.entries(fields.confidence_scores ?? {})) {
    const weight = criticalFields.includes(field) ? 2 : 1
    weighted += score * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0
}
