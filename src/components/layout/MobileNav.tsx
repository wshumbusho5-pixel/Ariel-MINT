'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  Banknote,
  Settings,
  MoreHorizontal,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Trophy,
  Users,
  X,
} from 'lucide-react'

const mainNav = [
  { href: '/dashboard',   label: 'Home',       icon: LayoutDashboard },
  { href: '/bets',        label: 'Bets',       icon: BookOpen },
  { href: '/withdrawals', label: 'Withdraw',   icon: Banknote },
  { href: '/settings',    label: 'Settings',   icon: Settings },
]

const moreNav = [
  { href: '/analytics',             label: 'Analytics',    icon: BarChart3 },
  { href: '/analytics/projections', label: 'Projections',  icon: TrendingUp },
  { href: '/risk',                  label: 'Risk Alerts',  icon: ShieldAlert },
  { href: '/rankings',              label: 'Rankings',     icon: Trophy },
  { href: '/leaderboard',           label: 'Leaderboard',  icon: Users },
]

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 flex">
        {mainNav.map(({ href, label, icon: Icon }) => {
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

        {/* More button */}
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
            moreNav.some(n => pathname === n.href || pathname.startsWith(n.href))
              ? 'text-emerald-400'
              : 'text-slate-500'
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          More
        </button>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-up drawer */}
      <div
        className={cn(
          'lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-2xl transition-transform duration-300',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-sm font-semibold text-white">More</span>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-8 grid grid-cols-3 gap-3">
          {moreNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl text-xs font-medium transition-colors',
                  active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                )}
              >
                <Icon className="w-6 h-6" />
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
