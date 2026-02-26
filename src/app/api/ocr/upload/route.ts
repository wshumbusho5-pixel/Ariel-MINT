import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  try {
    const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Use service client for storage to bypass bucket RLS
    const serviceSupabase = createServiceClient()
    const { error: uploadError } = await serviceSupabase.storage
      .from('bet-slips')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Create OCR job record (using user client so RLS applies correctly)
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({
        user_id: user.id,
        storage_path: fileName,
        status: 'queued',
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({ error: `Failed to create job: ${jobError.message}` }, { status: 500 })
    }

    // Trigger Inngest OCR processing
    await inngest.send({
      name: 'ocr/job.created',
      data: { jobId: job.id, userId: user.id },
    }).catch(() => {}) // Don't fail if Inngest unavailable in dev

    return NextResponse.json({ jobId: job.id }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
