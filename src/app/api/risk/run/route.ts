import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await inngest.send({
    name: 'risk/check.requested',
    data: { userId: user.id },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
