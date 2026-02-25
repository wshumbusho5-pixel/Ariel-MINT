'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  ShieldAlert,
  Banknote,
  Trophy,
  Users,
  Settings,
  TrendingUp,
  LogOut,
  MessageSquare,
  MessageCircle,
  Award,
  CreditCard,
  Activity,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/bets',         label: 'Bets',         icon: BookOpen },
  { href: '/analytics',    label: 'Analytics',    icon: BarChart3 },
  { href: '/analytics/projections', label: 'Projections', icon: TrendingUp },
  { href: '/analytics/performance', label: 'Performance', icon: Activity },
  { href: '/risk',         label: 'Risk Alerts',  icon: ShieldAlert },
  { href: '/withdrawals',  label: 'Withdrawals',  icon: Banknote },
  { href: '/chat',              label: 'Group Chat',   icon: MessageSquare },
  { href: '/messages',          label: 'Messages',     icon: MessageCircle },
  { href: '/rankings',          label: 'Rankings',     icon: Trophy },
  { href: '/leaderboard',       label: 'Leaderboard',  icon: Users },
  { href: '/advisors',          label: 'Advisors',     icon: Award },
  { href: '/settings/billing',  label: 'Billing',      icon: CreditCard },
  { href: '/settings',          label: 'Settings',     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
          A
        </div>
        <span className="text-lg font-bold text-white">Ariel MINT</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-emerald-400' : '')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
