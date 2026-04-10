'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types'
import {
  LayoutDashboard, Kanban, Users, Snowflake, MessageSquare,
  Award, Phone, ListTodo, RefreshCw, Settings, Zap, X,
} from 'lucide-react'

interface SidebarProps {
  role: UserRole | undefined
  pendingMessages: number
  pendingTasks: number
  open: boolean
  onClose: () => void
  profile?: { name?: string; email?: string; role?: string } | null
}

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/leads-frios', label: 'Leads Frios', icon: Snowflake },
  { href: '/messages', label: 'Mensagens', icon: MessageSquare, badge: 'pendingMessages' as const },
  { href: '/testimonials', label: 'Depoimentos', icon: Award },
  { href: '/calls', label: 'Calls', icon: Phone },
  { href: '/tasks', label: 'Tarefas', icon: ListTodo, badge: 'pendingTasks' as const },
  { href: '/follow-up', label: 'Follow-up', icon: RefreshCw },
]

export function Sidebar({ role, pendingMessages, pendingTasks, open, onClose, profile }: SidebarProps) {
  const pathname = usePathname()
  const badges = { pendingMessages, pendingTasks }

  const allItems = [
    ...nav,
    ...(role === 'admin' ? [{ href: '/settings', label: 'Configuracoes', icon: Settings }] : []),
  ]

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-[#080a14] text-slate-400 border-r border-[#1a1f3e] transition-transform lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1a1f3e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
              Agiliza Flow
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {allItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const isExact = pathname === item.href
            const Icon = item.icon
            const badgeKey = 'badge' in item ? item.badge : undefined
            const badgeCount = badgeKey ? badges[badgeKey as keyof typeof badges] : 0
            const isMsgBadge = badgeKey === 'pendingMessages'

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200',
                  (isExact || active)
                    ? 'text-emerald-400 bg-emerald-400/[0.08]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] hover:translate-x-0.5'
                )}
              >
                {(isExact || active) && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-emerald-400"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      'ml-auto flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[11px] font-semibold',
                      isMsgBadge ? 'bg-emerald-400/15 text-emerald-400' : 'bg-pink-400/15 text-pink-400'
                    )}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#1a1f3e] to-transparent mx-3" />

        {/* User section */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
              {(profile?.name || profile?.email || '?')[0].toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080a14]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{profile?.name || profile?.email || 'Usuario'}</p>
            <p className="text-[11px] text-slate-500">{profile?.role || 'admin'}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
