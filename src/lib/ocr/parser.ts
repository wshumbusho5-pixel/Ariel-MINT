import { detectBookmaker } from './bookmakerTemplates'
import { parseOdds, americanToDecimal } from '@/lib/utils/odds'
import type { ParsedBetFields } from '@/types/database'

/**
 * Strip commas from a number string and parse it
 * Handles "700,000" → 700000, "1,234.56" → 1234.56
 */
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''))
}

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
  // African currencies: UGX, KES, NGN, GHS, ZMW, TZS, ZAR, RWF, ETB, XOF
  const AFRICAN_CURRENCIES = /UGX|KES|NGN|GHS|ZMW|TZS|ZAR|RWF|ETB|XOF/i

  const stakePatterns = [
    ...(template?.patterns.stake ?? []),
    // "PLACE BET UGX 700000" or "PLACE BET UGX 700,000"
    /PLACE\s+BET\s+(?:UGX|KES|NGN|GHS|ZMW|TZS|ZAR|RWF|XOF)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i,
    // "[CURRENCY] 700,000" or "[CURRENCY]700000"
    /(?:UGX|KES|NGN|GHS|ZMW|TZS|ZAR|RWF|ETB|XOF)\s*(\d[\d,]*(?:\.\d{1,2})?)/i,
    // Standard stake with comma-separated large numbers
    /(?:stake|bet|wager)[:\s]+(?:\$|£|€|UGX|KES|NGN|GHS)?[\s]*(\d[\d,]*(?:\.\d{1,2})?)/i,
    // Standard $£€
    /(?:\$|£|€)\s*(\d[\d,]*(?:\.\d{1,2})?)/,
  ]

  for (const pattern of stakePatterns) {
    const match = text.match(pattern)
    if (match) {
      const stake = parseAmount(match[1])
      if (!isNaN(stake) && stake > 0) {
        result.stake = stake
        confidenceScores.stake = template?.patterns.stake?.includes(pattern) ? 0.85 : 0.6
        break
      }
    }
  }

  // ─── CURRENCY DETECTION (for display) ──────────────────────
  // Store currency hint in notes if it's an African currency
  const currencyMatch = text.match(/\b(UGX|KES|NGN|GHS|ZMW|TZS|ZAR|RWF|ETB|XOF)\b/)
  if (currencyMatch) {
    // We don't have a currency field in ParsedBetFields, but we can note it
    if (!result.notes) result.notes = `Currency: ${currencyMatch[1]}`
  }

  // ─── EVENT NAME ─────────────────────────────────────────────
  const eventPatterns = [
    ...(template?.patterns.event ?? []),
    // "Team A - Team B" or "Team A vs Team B" (most common)
    /([A-Z][a-zA-ZÀ-ÿ\s\.]+?)\s+(?:[-–]|vs\.?)\s+([A-Z][a-zA-ZÀ-ÿ\s\.]+?)(?=\n|$|\s{2,})/m,
    // "Team A v Team B"
    /([A-Z][a-zA-ZÀ-ÿ\s\.]+?)\s+v\s+([A-Z][a-zA-ZÀ-ÿ\s\.]+?)(?=\n|$|\s{2,})/m,
  ]

  for (const pattern of eventPatterns) {
    const match = text.match(pattern)
    if (match) {
      const candidate = match[0].trim()
      // Reject if it looks like an address/date/amount, not a match
      if (
        candidate.length > 5 &&
        candidate.length < 80 &&
        !/^\d/.test(candidate) &&
        !/\d{4}/.test(candidate)
      ) {
        result.event_name = candidate
        confidenceScores.event_name = 0.7
        break
      }
    }
  }

  // ─── MARKET ─────────────────────────────────────────────────
  const marketPatterns = [
    ...(template?.patterns.market ?? []),
    /(1X2(?:\s+Full\s+Time)?)/i,
    /(Full\s+Time\s+Result)/i,
    /(Both\s+Teams?\s+to\s+Score)/i,
    /(Over\s+\d+\.?\d*\s+Goals?)/i,
    /(Under\s+\d+\.?\d*\s+Goals?)/i,
    /(Double\s+Chance)/i,
    /(Draw\s+No\s+Bet)/i,
    /(Asian\s+Handicap)/i,
    /(Correct\s+Score)/i,
    /(First\s+(?:Goal|Scorer))/i,
    /(Anytime\s+Scorer)/i,
    /(Match\s+Result)/i,
    /(Moneyline)/i,
    /(Spread)/i,
    /(Total\s+Points?)/i,
    /(Handicap)/i,
  ]

  for (const pattern of marketPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.market = match[1].trim()
      confidenceScores.market = 0.75
      break
    }
  }

  // ─── SELECTION ──────────────────────────────────────────────
  // Try to extract selection from market context
  // "(1)" = Home, "(2)" = Away, "(X)" or "(0)" = Draw
  const selectionPatterns = [
    ...(template?.patterns.selection ?? []),
    /\(\s*([12X])\s*\)/i,  // (1), (2), (X)
    /(?:selection|pick)[:\s]+(.+?)(?:\n|$)/i,
    /(?:home|away|draw)\s+win/i,
  ]

  for (const pattern of selectionPatterns) {
    const match = text.match(pattern)
    if (match) {
      const sel = match[1]?.trim()
      if (sel === '1') result.selection = 'Home Win'
      else if (sel === '2') result.selection = 'Away Win'
      else if (sel?.toUpperCase() === 'X') result.selection = 'Draw'
      else if (sel) result.selection = sel
      if (result.selection) {
        confidenceScores.selection = 0.7
        break
      }
    }
  }

  // ─── DATE ───────────────────────────────────────────────────
  const datePatterns = [
    ...(template?.patterns.date ?? []),
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
  if (/\b(acca|accumulator|parlay|combo)\b/.test(lowerText)) {
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
    [/\b(soccer|premier\s*league|la\s*liga|bundesliga|serie\s*a|champions\s*league|epl|ligue\s*1|eredivisie|fa\s*cup|copa)\b/i, 'Football'],
    [/\b(basketball|nba|wnba|ncaa basketball|euroleague)\b/i, 'Basketball'],
    [/\b(american football|nfl|ncaa football|super bowl)\b/i, 'American Football'],
    [/\b(tennis|atp|wta|wimbledon|us open|roland garros|australian open)\b/i, 'Tennis'],
    [/\b(baseball|mlb)\b/i, 'Baseball'],
    [/\b(ice hockey|nhl|hockey)\b/i, 'Ice Hockey'],
    [/\b(mma|ufc|boxing|fight)\b/i, 'MMA/Boxing'],
    [/\b(horse racing|racing|derby|handicap race)\b/i, 'Horse Racing'],
    [/\b(rugby|six nations|premiership rugby)\b/i, 'Rugby'],
    [/\b(cricket|ipl|test match|twenty20|t20|odi)\b/i, 'Cricket'],
  ]

  for (const [pattern, sport] of sports) {
    if (pattern.test(text)) {
      result.sport = sport
      confidenceScores.sport = 0.8
      break
    }
  }

  // Fallback: if market is "1X2" or "Full Time Result" and no sport, assume Football
  if (!result.sport && (result.market?.match(/1X2|Full Time/i) || text.match(/full\s*time/i))) {
    result.sport = 'Football'
    confidenceScores.sport = 0.5
  }

  // Fallback: if event_name contains " - " between two words and no sport, assume Football
  if (!result.sport && result.event_name && result.event_name.includes(' - ')) {
    result.sport = 'Football'
    confidenceScores.sport = 0.4
  }

  result.confidence_scores = confidenceScores

  return result
}

/**
 * Score the overall confidence of a parsed result (0–100)
 */
export function getParseConfidence(fields: ParsedBetFields): number {
  const scores = Object.values(fields.confidence_scores ?? {})
  if (scores.length === 0) return 0

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
