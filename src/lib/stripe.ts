import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return _stripe
}

// Convenience export for direct use
export { getStripe as stripe }

export const PRICE_IDS = {
  regular: process.env.STRIPE_PRICE_REGULAR!,
  advisor: process.env.STRIPE_PRICE_ADVISOR!,
} as const

export type PlanType = 'regular' | 'advisor'
