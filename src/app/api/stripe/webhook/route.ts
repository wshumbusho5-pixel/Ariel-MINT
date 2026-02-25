import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

// Helper: extract period end from subscription (Stripe v20 moved it to item level)
function getPeriodEnd(sub: unknown): string | null {
  const s = sub as Record<string, unknown>
  // Try item-level first (Stripe v20+)
  const items = s.items as { data?: Array<Record<string, unknown>> } | undefined
  const itemEnd = items?.data?.[0]?.current_period_end as number | undefined
  if (itemEnd) return new Date(itemEnd * 1000).toISOString()
  // Fall back to subscription-level (older API)
  const subEnd = s.current_period_end as number | undefined
  if (subEnd) return new Date(subEnd * 1000).toISOString()
  return null
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan as 'regular' | 'advisor' | undefined

    if (!userId || !plan) return NextResponse.json({ received: true })

    const subscription = await stripe().subscriptions.retrieve(session.subscription as string)
    const periodEnd = getPeriodEnd(subscription)

    await supabase.from('profiles').update({
      subscription_status: 'active',
      subscription_tier: plan,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      sub_period_end: periodEnd,
    }).eq('id', userId)
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    if (!userId) return NextResponse.json({ received: true })

    const plan = sub.metadata?.plan as 'regular' | 'advisor' | undefined
    const status = sub.status === 'active' || sub.status === 'trialing' ? 'active'
      : sub.status === 'past_due' ? 'past_due'
      : 'canceled'
    const periodEnd = getPeriodEnd(sub)

    await supabase.from('profiles').update({
      subscription_status: status,
      subscription_tier: plan ?? 'regular',
      sub_period_end: periodEnd,
    }).eq('id', userId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    if (!userId) return NextResponse.json({ received: true })

    await supabase.from('profiles').update({
      subscription_status: 'canceled',
      subscription_tier: 'none',
    }).eq('id', userId)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = invoice.customer as string
    if (!customerId) return NextResponse.json({ received: true })

    await supabase.from('profiles').update({
      subscription_status: 'past_due',
    }).eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}
