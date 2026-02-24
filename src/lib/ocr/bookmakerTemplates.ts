/**
 * Per-bookmaker extraction hints
 * Each template defines regex patterns for key fields
 */

export interface BookmakerTemplate {
  name: string
  identifiers: string[]  // strings that identify this bookmaker in OCR text
  patterns: {
    odds?: RegExp[]
    stake?: RegExp[]
    selection?: RegExp[]
    event?: RegExp[]
    market?: RegExp[]
    betReference?: RegExp[]
    date?: RegExp[]
  }
}

export const BOOKMAKER_TEMPLATES: BookmakerTemplate[] = [
  {
    name: 'Bet365',
    identifiers: ['bet365', 'bet 365'],
    patterns: {
      odds: [/(?:odds|price)[:\s]+(\d+\.?\d*)/i, /@ (\d+\.\d+)/],
      stake: [/(?:stake|bet)[:\s]+(?:\$|£|€)?(\d+\.?\d*)/i, /wager[:\s]+(?:\$|£|€)?(\d+\.?\d*)/i],
      betReference: [/bet\s*id[:\s]+([A-Z0-9]+)/i, /ref(?:erence)?[:\s]+([A-Z0-9-]+)/i],
    },
  },
  {
    name: 'DraftKings',
    identifiers: ['draftkings', 'draft kings'],
    patterns: {
      odds: [/([+-]\d{3,4})\b/, /(?:odds)[:\s]+([+-]?\d+\.?\d*)/i],
      stake: [/(?:wager|bet amount)[:\s]+(?:\$)?(\d+\.?\d*)/i],
      betReference: [/bet\s*id[:\s]+([A-Z0-9-]+)/i],
    },
  },
  {
    name: 'FanDuel',
    identifiers: ['fanduel', 'fan duel'],
    patterns: {
      odds: [/([+-]\d{3,4})\b/, /(\d+\.\d+)x/],
      stake: [/(?:wager|to win)[:\s]+(?:\$)?(\d+\.?\d*)/i],
      betReference: [/ticket[:\s]+([A-Z0-9-]+)/i],
    },
  },
  {
    name: 'William Hill',
    identifiers: ['william hill', 'williamhill', 'caesars'],
    patterns: {
      odds: [/(\d+\/\d+)/, /(?:price|odds)[:\s]+(\d+\.?\d*)/i],
      stake: [/(?:stake)[:\s]+(?:\$|£|€)?(\d+\.?\d*)/i],
      betReference: [/(?:bet|ref)\s*no[:\s]+([A-Z0-9]+)/i],
    },
  },
  {
    name: 'Betway',
    identifiers: ['betway'],
    patterns: {
      odds: [/(?:odds)[:\s]+(\d+\.?\d*)/i, /@ (\d+\.\d+)/],
      stake: [/(?:stake)[:\s]+(?:\$|£|€)?(\d+\.?\d*)/i],
    },
  },
  {
    name: 'Paddy Power',
    identifiers: ['paddy power', 'paddypower'],
    patterns: {
      odds: [/(\d+\/\d+)/, /(?:evs|evens)/i, /(\d+\.\d+)/],
      stake: [/(?:stake)[:\s]+(?:\$|£|€)?(\d+\.?\d*)/i],
    },
  },
  {
    name: 'Betfair',
    identifiers: ['betfair', 'betfair exchange'],
    patterns: {
      odds: [/(?:lay|back)\s+@\s+(\d+\.\d+)/, /(\d+\.\d+)/],
      stake: [/(?:stake|liability)[:\s]+(?:\$|£|€)?(\d+\.?\d*)/i],
    },
  },
]

/**
 * Detect bookmaker from full OCR text
 */
export function detectBookmaker(text: string): BookmakerTemplate | null {
  const lower = text.toLowerCase()
  for (const template of BOOKMAKER_TEMPLATES) {
    if (template.identifiers.some(id => lower.includes(id))) {
      return template
    }
  }
  return null
}
