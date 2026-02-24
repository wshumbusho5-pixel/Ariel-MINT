import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'
import { detectText } from '@/lib/ocr/visionClient'
import { parseBetSlip, getParseConfidence } from '@/lib/ocr/parser'

export const processOcrJob = inngest.createFunction(
  {
    id: 'process-ocr-job',
    name: 'Process OCR Bet Slip',
    retries: 3,
  },
  { event: 'ocr/job.created' },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: string }

    // Step 1: Mark as processing
    await step.run('mark-processing', async () => {
      const supabase = createServiceClient()
      await supabase
        .from('ocr_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId)
    })

    // Step 2: Download image from Supabase Storage and call Vision API
    const ocrResult = await step.run('call-vision-api', async () => {
      const supabase = createServiceClient()

      const { data: job } = await supabase
        .from('ocr_jobs')
        .select('storage_path, user_id')
        .eq('id', jobId)
        .single()

      if (!job) throw new Error('Job not found')

      // Download image from Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('bet-slips')
        .download(job.storage_path)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download image: ${downloadError?.message}`)
      }

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      // Call Vision API
      const { fullText } = await detectText(base64)

      return { fullText, storagePath: job.storage_path }
    })

    // Step 3: Parse the OCR text
    const parsed = await step.run('parse-text', async () => {
      const fields = parseBetSlip(ocrResult.fullText)
      const confidence = getParseConfidence(fields)
      return { fields, confidence }
    })

    // Step 4: Update job with results
    await step.run('save-results', async () => {
      const supabase = createServiceClient()
      await supabase
        .from('ocr_jobs')
        .update({
          status: 'completed',
          raw_vision_json: { full_text: ocrResult.fullText },
          parsed_fields: parsed.fields,
          confidence_pct: parsed.confidence,
        })
        .eq('id', jobId)
    })

    return { jobId, confidence: parsed.confidence, fieldsFound: Object.keys(parsed.fields).length }
  }
)
