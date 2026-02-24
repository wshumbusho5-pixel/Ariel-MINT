'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BookOpen, BarChart3, ShieldAlert, Trophy } from 'lucide-react'

const mobileNav = [
  { href: '/dashboard',  label: 'Home',      icon: LayoutDashboard },
  { href: '/bets',       label: 'Bets',      icon: BookOpen },
  { href: '/analytics',  label: 'Analytics', icon: BarChart3 },
  { href: '/risk',       label: 'Risk',      icon: ShieldAlert },
  { href: '/rankings',   label: 'Rankings',  icon: Trophy },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 flex">
      {mobileNav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
              active ? 'text-emerald-400' : 'text-slate-500'
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
