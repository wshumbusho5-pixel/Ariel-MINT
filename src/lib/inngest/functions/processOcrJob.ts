import { NonRetriableError } from 'inngest'
import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'
import { detectText } from '@/lib/ocr/visionClient'
import { parseBetSlip, getParseConfidence } from '@/lib/ocr/parser'

export const processOcrJob = inngest.createFunction(
  {
    id: 'process-ocr-job',
    name: 'Process OCR Bet Slip',
    retries: 2,
    onFailure: async ({ event }) => {
      // Runs after all retries are exhausted
      const originalData = (event.data as { event?: { data?: { jobId?: string } } }).event?.data
      const jobId = originalData?.jobId
      if (!jobId) return

      const errorMsg = (event.data as { error?: { message?: string } }).error?.message ?? 'Processing failed'
      const supabase = createServiceClient()
      await supabase
        .from('ocr_jobs')
        .update({ status: 'failed', error_message: errorMsg })
        .eq('id', jobId)
    },
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

    // Step 2: Verify API key is configured — fail fast, no retries
    await step.run('check-api-key', async () => {
      if (!process.env.GOOGLE_VISION_API_KEY) {
        const supabase = createServiceClient()
        await supabase
          .from('ocr_jobs')
          .update({
            status: 'rejected',
            error_message: 'OCR service is not configured on this server. Please add your bet manually.',
          })
          .eq('id', jobId)
        throw new NonRetriableError('GOOGLE_VISION_API_KEY not configured')
      }
    })

    // Step 3: Download image and call Vision API
    const ocrResult = await step.run('call-vision-api', async () => {
      const supabase = createServiceClient()

      const { data: job } = await supabase
        .from('ocr_jobs')
        .select('storage_path, user_id')
        .eq('id', jobId)
        .single()

      if (!job) throw new Error('Job not found')

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('bet-slips')
        .download(job.storage_path)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download image: ${downloadError?.message ?? 'unknown error'}`)
      }

      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const { fullText } = await detectText(base64)

      return { fullText, storagePath: job.storage_path }
    })

    // Step 4: Parse the OCR text
    const parsed = await step.run('parse-text', async () => {
      const fields = parseBetSlip(ocrResult.fullText)
      const confidence = getParseConfidence(fields)
      return { fields, confidence }
    })

    // Step 5: Save results — mark completed even if confidence is low
    await step.run('save-results', async () => {
      const supabase = createServiceClient()
      // If critical fields are missing, mark as 'rejected' rather than 'completed'
      const hasCritical = parsed.fields.odds || parsed.fields.stake
      await supabase
        .from('ocr_jobs')
        .update({
          status: hasCritical ? 'completed' : 'rejected',
          raw_vision_json: { full_text: ocrResult.fullText },
          parsed_fields: parsed.fields,
          confidence_pct: parsed.confidence,
          error_message: hasCritical ? null : 'Could not extract odds or stake from this image',
        })
        .eq('id', jobId)
    })

    return { jobId, confidence: parsed.confidence, fieldsFound: Object.keys(parsed.fields).length }
  }
)
