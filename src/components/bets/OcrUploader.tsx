'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export function OcrUploader() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setStatus('uploading')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? 'Upload failed')
      }

      const { jobId: id } = await response.json()
      setJobId(id)
      setStatus('processing')

      // Poll for completion
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        if (attempts > 30) {
          clearInterval(poll)
          setStatus('error')
          toast.error('OCR timed out. Try again.')
          return
        }

        const res = await fetch(`/api/ocr/${id}`)
        const { job } = await res.json()

        if (job?.status === 'completed') {
          clearInterval(poll)
          setStatus('done')
          toast.success('Bet slip parsed! Review the details below.')
          // Redirect to new bet form with OCR prefill
          router.push(`/bets/new?ocrJobId=${id}`)
        } else if (job?.status === 'failed' || job?.status === 'rejected') {
          clearInterval(poll)
          setStatus('error')
          const msg = job.error_message ?? 'Could not parse this slip. Try adding the bet manually.'
          toast.error(msg)
        }
      }, 2000)
    } catch (err) {
      setStatus('error')
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      toast.error(msg)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-4">
      <Card
        className={`bg-slate-900 border-2 border-dashed transition-colors ${
          status === 'idle' ? 'border-slate-700 hover:border-slate-500' : 'border-slate-700'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          {status === 'idle' && (
            <>
              <Camera className="w-12 h-12 text-slate-500 mb-4" />
              <p className="text-white font-medium mb-1">Upload bet slip screenshot</p>
              <p className="text-slate-400 text-sm mb-5">
                Drag & drop or click to select. Supports JPG, PNG, WebP.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => fileRef.current?.click()}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <Button
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.setAttribute('capture', 'environment')
                      fileRef.current.click()
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </>
          )}

          {status === 'uploading' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-white font-medium">Uploading...</p>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-white font-medium">Analysing your bet slip...</p>
              <p className="text-slate-400 text-sm">Our AI is reading the odds, stake, and selection</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <p className="text-white font-medium">Parsed successfully!</p>
              <p className="text-slate-400 text-sm">Redirecting to the bet form...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-white font-medium">Parsing failed</p>
              <p className="text-slate-400 text-sm">Try a clearer image or add the bet manually</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => { setStatus('idle'); setPreview(null) }}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => router.push('/bets/new')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                >
                  Add Manually
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image preview */}
      {preview && status !== 'idle' && (
        <div className="rounded-lg overflow-hidden border border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Bet slip preview" className="w-full max-h-80 object-contain bg-slate-900" />
        </div>
      )}

      {/* Tips */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">Tips for best results:</p>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• Take a full screenshot of the bet confirmation screen</li>
            <li>• Make sure the odds, stake, and selection are clearly visible</li>
            <li>• Higher resolution images parse more accurately</li>
            <li>• Works with Bet365, DraftKings, FanDuel, William Hill, Betway, and more</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
