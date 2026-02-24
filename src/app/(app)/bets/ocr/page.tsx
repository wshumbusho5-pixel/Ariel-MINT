import { OcrUploader } from '@/components/bets/OcrUploader'

export default function OcrPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Scan Bet Slip</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Upload a screenshot of your bet slip — we&apos;ll auto-fill the details
        </p>
      </div>
      <OcrUploader />
    </div>
  )
}
