import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { detectText } from '@/lib/ocr/visionClient'
import { parseBetSlip, getParseConfidence } from '@/lib/ocr/parser'

// Allow up to 60s for Vision API call
export const maxDuration = 60

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

  const serviceSupabase = createServiceClient()

  try {
    // Step 1: Upload image to storage
    const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await serviceSupabase.storage
      .from('bet-slips')
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Step 2: Create job record
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({ user_id: user.id, storage_path: fileName, status: 'processing' })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({ error: `Failed to create job: ${jobError.message}` }, { status: 500 })
    }

    // Step 3: Check Vision API key
    if (!process.env.GOOGLE_VISION_API_KEY) {
      await serviceSupabase.from('ocr_jobs').update({
        status: 'rejected',
        error_message: 'OCR service is not configured. Please add your bet manually.',
      }).eq('id', job.id)
      return NextResponse.json({ jobId: job.id }, { status: 201 })
    }

    // Step 4: Call Vision API
    let fullText = ''
    try {
      const base64 = buffer.toString('base64')
      const result = await detectText(base64)
      fullText = result.fullText
    } catch (visionErr) {
      const msg = visionErr instanceof Error ? visionErr.message : 'Vision API failed'
      await serviceSupabase.from('ocr_jobs').update({
        status: 'failed',
        error_message: msg,
      }).eq('id', job.id)
      return NextResponse.json({ jobId: job.id }, { status: 201 })
    }

    // Step 5: Parse text
    const fields = parseBetSlip(fullText)
    const confidence = getParseConfidence(fields)
    const hasCritical = !!(fields.odds || fields.stake)

    await serviceSupabase.from('ocr_jobs').update({
      status: hasCritical ? 'completed' : 'rejected',
      raw_vision_json: { full_text: fullText },
      parsed_fields: fields,
      confidence_pct: confidence,
      error_message: hasCritical ? null : 'Could not extract odds or stake from this image',
    }).eq('id', job.id)

    return NextResponse.json({ jobId: job.id }, { status: 201 })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
