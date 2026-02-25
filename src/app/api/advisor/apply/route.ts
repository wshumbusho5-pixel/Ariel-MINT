import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PRICE_IDS } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, advisor_status, stripe_customer_id, stripe_subscription_id, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Active subscription required to become an advisor' }, { status: 403 })
  }
  if (profile.advisor_status !== 'none') {
    return NextResponse.json({ error: 'Already applied or active as advisor' }, { status: 400 })
  }

  // Check account age (60+ days)
  const accountDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
  if (accountDays < 60) {
    return NextResponse.json({
      error: `Account must be at least 60 days old (${60 - accountDays} days remaining)`,
    }, { status: 400 })
  }

  // Check settled bet count (100+)
  const { count: settledCount } = await supabase
    .from('bets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])

  if ((settledCount ?? 0) < 100) {
    return NextResponse.json({
      error: `Need 100 settled bets to apply (you have ${settledCount ?? 0})`,
    }, { status: 400 })
  }

  // Check 90-day ROI (must be positive)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()
  const { data: recentBets } = await supabase
    .from('bets')
    .select('profit_loss, stake')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .in('status', ['won', 'lost', 'cashout', 'partial_cashout'])
    .gte('placed_at', ninetyDaysAgo)

  const totalPL = (recentBets ?? []).reduce((s, b) => s + (b.profit_loss ?? 0), 0)
  const totalStake = (recentBets ?? []).reduce((s, b) => s + b.stake, 0)
  const roi90 = totalStake > 0 ? totalPL / totalStake : 0

  if (roi90 <= 0) {
    return NextResponse.json({
      error: 'Positive ROI over the last 90 days required to become an advisor',
    }, { status: 400 })
  }

  // All checks passed — mark as advisor
  await supabase.from('profiles').update({
    advisor_status: 'active',
    advisor_since: new Date().toISOString(),
  }).eq('id', user.id)

  // If they're on the regular plan, upgrade their Stripe subscription to advisor price
  if (profile.stripe_subscription_id) {
    try {
      const sub = await stripe().subscriptions.retrieve(profile.stripe_subscription_id)
      const item = sub.items.data[0]
      if (item) {
        await stripe().subscriptions.update(profile.stripe_subscription_id, {
          items: [{ id: item.id, price: PRICE_IDS.advisor }],
          metadata: { user_id: user.id, plan: 'advisor' },
          proration_behavior: 'always_invoice',
        })
        await supabase.from('profiles').update({
          subscription_tier: 'advisor',
        }).eq('id', user.id)
      }
    } catch {
      // Subscription update failed — redirect to checkout instead
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ariel-mint.vercel.app'
      const session = await stripe().checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: PRICE_IDS.advisor, quantity: 1 }],
        customer: profile.stripe_customer_id ?? undefined,
        metadata: { user_id: user.id, plan: 'advisor' },
        subscription_data: { metadata: { user_id: user.id, plan: 'advisor' } },
        success_url: `${appUrl}/settings?advisor=1`,
        cancel_url: `${appUrl}/settings`,
      })
      return NextResponse.json({ checkout_url: session.url })
    }
  }

  return NextResponse.json({ success: true })
}
