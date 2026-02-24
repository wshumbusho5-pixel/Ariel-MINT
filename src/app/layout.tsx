import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ServiceWorkerRegistrar } from '@/components/shared/ServiceWorkerRegistrar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ariel MINT — Smart Betting Analytics',
  description: 'Track bets, analyse profits, detect risks, and make smarter decisions with Ariel MINT.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ariel MINT',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
