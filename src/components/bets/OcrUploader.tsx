'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Scan, ImageIcon, Zap } from 'lucide-react'

const BOOKMAKERS = ['Betway', 'Bet365', 'SportyBet', '1xBet', 'DraftKings', 'FanDuel', 'BetPawa', 'William Hill']

const STEPS = ['Upload', 'Scan', 'Extract'] as const

export function OcrUploader() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

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
          toast.success('Bet slip parsed!')
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
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const isActive = status !== 'idle'
  const stepIndex = status === 'uploading' ? 0 : status === 'processing' ? 1 : status === 'done' ? 2 : -1

  return (
    <div className="space-y-4">

      {/* ── Main card ─────────────────────────────────────────── */}
      <div
        className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
          dragOver ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
      >
        {/* Gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-slate-800 to-slate-900 p-px">
          <div className="w-full h-full rounded-2xl bg-slate-900" />
        </div>

        <div className="relative">

          {/* ── IDLE ──────────────────────────────────────────── */}
          {status === 'idle' && (
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Scan className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">Scan Bet Slip</h3>
                  <p className="text-slate-400 text-sm mt-0.5">AI reads your slip and fills in the bet form automatically</p>
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group ${
                  dragOver
                    ? 'border-emerald-400 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
                onClick={() => fileRef.current?.click()}
              >
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-slate-700 transition-colors flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-300 text-sm font-medium">Drop screenshot here</p>
                    <p className="text-slate-500 text-xs mt-0.5">JPG, PNG, WebP up to 10MB</p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => fileRef.current?.click()}
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
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
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
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

              {/* Divider + tips */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-xs font-semibold text-slate-300">Tips for best results</p>
                </div>
                <ul className="text-xs text-slate-500 space-y-1.5">
                  <li className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">→</span> Take a full screenshot of the bet confirmation screen</li>
                  <li className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">→</span> Make sure odds, stake, and selection are clearly visible</li>
                  <li className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">→</span> Higher resolution images parse more accurately</li>
                </ul>

                {/* Supported bookmakers */}
                <div className="mt-4">
                  <p className="text-xs text-slate-600 mb-2">Supported bookmakers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BOOKMAKERS.map(bm => (
                      <span key={bm} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {bm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIVE STATES (uploading / processing / done / error) ── */}
          {isActive && (
            <div className="p-6 sm:p-8">
              {/* Step progress */}
              {(status === 'uploading' || status === 'processing') && (
                <div className="flex items-center gap-2 mb-6">
                  {STEPS.map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        i < stepIndex ? 'text-emerald-400' :
                        i === stepIndex ? 'text-white' :
                        'text-slate-600'
                      }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border transition-colors ${
                          i < stepIndex ? 'bg-emerald-500 border-emerald-500 text-slate-950' :
                          i === stepIndex ? 'border-emerald-400 text-emerald-400' :
                          'border-slate-700 text-slate-600'
                        }`}>
                          {i < stepIndex ? '✓' : i + 1}
                        </div>
                        {step}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`w-8 h-px transition-colors ${i < stepIndex ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Two-column layout: preview + status */}
              <div className={`flex gap-5 ${preview ? 'items-start' : 'items-center justify-center'}`}>
                {/* Image preview */}
                {preview && (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-slate-700 flex-shrink-0 bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Bet slip" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Status content */}
                <div className="flex-1 min-w-0">
                  {status === 'uploading' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
                        <p className="text-white font-medium">Uploading image...</p>
                      </div>
                      <p className="text-slate-500 text-sm">Sending to secure storage</p>
                    </div>
                  )}

                  {status === 'processing' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
                        <p className="text-white font-medium">AI is reading your slip...</p>
                      </div>
                      <p className="text-slate-500 text-sm">Extracting odds, stake, and selection</p>
                      {/* Fake scanning progress dots */}
                      <div className="flex gap-1 mt-1">
                        {[0,1,2,3,4].map(i => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {status === 'done' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <p className="text-white font-medium">Parsed successfully</p>
                      </div>
                      <p className="text-slate-500 text-sm">Redirecting to the bet form...</p>
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-white font-medium">Could not parse slip</p>
                      </div>
                      <p className="text-slate-500 text-sm">Try a clearer image or add the bet manually</p>
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="sm"
                          onClick={() => { setStatus('idle'); setPreview(null) }}
                          variant="outline"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          Try Again
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => router.push('/bets/new')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                        >
                          Add Manually
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
