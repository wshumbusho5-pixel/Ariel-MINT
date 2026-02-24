import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params

  const { data: job, error } = await supabase
    .from('ocr_jobs')
    .select('id, status, parsed_fields, confidence_pct, error_message, created_at, updated_at')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ job })
}
