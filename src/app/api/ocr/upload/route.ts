import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  // Limit file size: 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  try {
    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('bet-slips')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Create OCR job record
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
      return NextResponse.json({ error: jobError.message }, { status: 500 })
    }

    // Trigger Inngest OCR processing
    await inngest.send({
      name: 'ocr/job.created',
      data: { jobId: job.id, userId: user.id },
    }).catch(() => {}) // Don't fail if Inngest unavailable

    return NextResponse.json({ jobId: job.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
