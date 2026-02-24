import { z } from 'zod'

export const betSchema = z.object({
  sport: z.string().min(1, 'Sport is required'),
  league: z.string().optional(),
  event_name: z.string().min(1, 'Event name is required'),
  event_date: z.string().min(1, 'Event date is required'),
  market: z.string().min(1, 'Market is required'),
  selection: z.string().min(1, 'Selection is required'),
  bet_type: z.enum(['single','double','treble','acca','system','teaser','other']).default('single'),
  bookmaker: z.string().min(1, 'Bookmaker is required'),
  bet_reference: z.string().optional(),
  odds: z.coerce.number().min(1.01, 'Odds must be greater than 1.00'),
  stake: z.coerce.number().min(0.01, 'Stake must be greater than 0'),
  confidence: z.coerce.number().min(1).max(5).optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  placed_at: z.string().optional(),
})

export type BetFormData = z.infer<typeof betSchema>

export const settleBetSchema = z.object({
  status: z.enum(['won','lost','void','cashout','partial_cashout']),
  actual_payout: z.coerce.number().min(0).optional(),
  settled_at: z.string().optional(),
}).refine((data) => {
  if (data.status === 'cashout' || data.status === 'partial_cashout') {
    return data.actual_payout !== undefined && data.actual_payout >= 0
  }
  return true
}, { message: 'Actual payout required for cashout', path: ['actual_payout'] })

export type SettleBetData = z.infer<typeof settleBetSchema>
