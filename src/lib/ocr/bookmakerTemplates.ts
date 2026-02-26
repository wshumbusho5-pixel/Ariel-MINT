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

// Matches African currency amounts with commas: "700,000" or "700000"
const AFRICAN_STAKE = /(?:PLACE\s+BET|stake|bet\s+amount|wager)[:\s]+(?:UGX|KES|NGN|GHS|ZMW|TZS|ZAR|RWF|ETB|XOF)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i
const CURRENCY_AMOUNT = /(?:UGX|KES|NGN|GHS|ZMW|TZS|ZAR|RWF|ETB|XOF)\s*(\d[\d,]*(?:\.\d{1,2})?)/i

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
      odds: [
        /(?:odds)[:\s]+(\d+\.?\d*)/i,
        /@ (\d+\.\d+)/,
        // Standalone decimal odds (1.01 – 50.00)
        /\b([1-9]\d{0,1}\.\d{2})\b/,
      ],
      stake: [
        // "PLACE BET UGX 700000" or "PLACE BET UGX 700,000"
        /PLACE\s+BET\s+(?:UGX|KES|NGN|GHS|ZMW|TZS|ZAR|RWF|XOF)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i,
        AFRICAN_STAKE,
        CURRENCY_AMOUNT,
        /(?:stake|bet)[:\s]+(?:\$|£|€)?(\d[\d,]*(?:\.\d{1,2})?)/i,
      ],
      market: [
        /(1X2(?:\s+Full\s+Time)?)/i,
        /(Full\s+Time\s+Result)/i,
        /(Both\s+Teams?\s+to\s+Score)/i,
        /(Over\s+\d+\.?\d*\s+Goals?)/i,
        /(Under\s+\d+\.?\d*\s+Goals?)/i,
        /(Double\s+Chance)/i,
        /(Draw\s+No\s+Bet)/i,
        /(Asian\s+Handicap)/i,
      ],
      betReference: [/(?:bet|ref|ticket|slip)[:\s#]+([A-Z0-9-]{4,20})/i],
    },
  },
  {
    name: 'SportyBet',
    identifiers: ['sportybet', 'sporty bet'],
    patterns: {
      odds: [/\b([1-9]\d{0,1}\.\d{2})\b/, /odds[:\s]+(\d+\.?\d*)/i],
      stake: [
        AFRICAN_STAKE,
        CURRENCY_AMOUNT,
        /(?:stake|bet)[:\s]+(?:\$|£|€)?(\d[\d,]*(?:\.\d{1,2})?)/i,
      ],
      betReference: [/(?:bet|ref|id|ticket)[:\s#]+([A-Z0-9-]{4,20})/i],
    },
  },
  {
    name: '1xBet',
    identifiers: ['1xbet', '1x bet', '1xбет'],
    patterns: {
      odds: [/(?:coeff|odds|коэф)[:\s.]+(\d+\.?\d*)/i, /\b([1-9]\d{0,1}\.\d{2})\b/],
      stake: [
        AFRICAN_STAKE,
        CURRENCY_AMOUNT,
        /(?:stake|bet amount|bet)[:\s]+(?:\$|£|€)?(\d[\d,]*(?:\.\d{1,2})?)/i,
      ],
      betReference: [/(?:bet|order|id)[:\s#]+(\d{6,15})/i],
    },
  },
  {
    name: 'BetPawa',
    identifiers: ['betpawa', 'bet pawa'],
    patterns: {
      odds: [/\b([1-9]\d{0,1}\.\d{2})\b/, /odds[:\s]+(\d+\.?\d*)/i],
      stake: [AFRICAN_STAKE, CURRENCY_AMOUNT],
      betReference: [/(?:bet|id|ref)[:\s#]+([A-Z0-9-]{4,20})/i],
    },
  },
  {
    name: 'Odibets',
    identifiers: ['odibets', 'odi bets', 'odibets.com'],
    patterns: {
      odds: [/\b([1-9]\d{0,1}\.\d{2})\b/, /odds[:\s]+(\d+\.?\d*)/i],
      stake: [AFRICAN_STAKE, CURRENCY_AMOUNT],
    },
  },
  {
    name: 'Betin',
    identifiers: ['betin', 'betin.co'],
    patterns: {
      odds: [/\b([1-9]\d{0,1}\.\d{2})\b/, /odds[:\s]+(\d+\.?\d*)/i],
      stake: [AFRICAN_STAKE, CURRENCY_AMOUNT],
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
