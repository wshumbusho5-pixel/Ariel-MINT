import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PRICE_IDS, type PlanType } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await request.json() as { plan: PlanType }
  if (!plan || !PRICE_IDS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, username')
    .eq('id', user.id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ariel-mint.vercel.app'

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email,
    metadata: {
      user_id: user.id,
      plan,
    },
    subscription_data: {
      metadata: { user_id: user.id, plan },
    },
    success_url: `${appUrl}/dashboard?subscribed=1`,
    cancel_url: `${appUrl}/upgrade`,
  })

  return NextResponse.json({ url: session.url })
}
