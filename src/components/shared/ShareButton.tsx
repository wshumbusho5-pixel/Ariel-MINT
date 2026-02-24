'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Share2, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ShareButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function createShareCard() {
    setLoading(true)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_type: 'performance', expires_days: 30 }),
      })
      if (!res.ok) throw new Error('Failed to create share card')
      const { slug } = await res.json()
      setShareUrl(`${window.location.origin}/share/${slug}`)
    } catch {
      toast.error('Could not create share card')
    } finally {
      setLoading(false)
    }
  }

  async function copyUrl() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen && !shareUrl) createShareCard()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Performance Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-400">
            Generate a public link showing your stats snapshot. The link expires in 30 days.
          </p>
          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating link...
            </div>
          )}
          {shareUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-300 flex-1 truncate">{shareUrl}</p>
              </div>
              <Button
                onClick={copyUrl}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <p className="text-xs text-slate-500 text-center">
                Anyone with this link can view your stats snapshot
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
