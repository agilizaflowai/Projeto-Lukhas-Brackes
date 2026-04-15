'use client'

import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types'
import {
  X, LayoutDashboard, GitBranch, Users, Snowflake,
  MessageSquare, Trophy, Phone, CheckSquare, RefreshCcw,
  Settings, Plus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NewLeadModal } from '@/components/dashboard/NewLeadModal'

interface SidebarProps {
  role: UserRole | undefined
  pendingMessages: number
  pendingTasks: number
  open: boolean
  onClose: () => void
  onLeadCreated?: () => void
  profile?: { name?: string; email?: string; role?: string; avatar?: string | null } | null
}

const nav: { href: string; label: string; icon: LucideIcon; badge?: 'pendingMessages' | 'pendingTasks' }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/leads-frios', label: 'Leads Frios', icon: Snowflake },
  { href: '/messages', label: 'Mensagens', icon: MessageSquare, badge: 'pendingMessages' },
  { href: '/testimonials', label: 'Depoimentos', icon: Trophy },
  { href: '/calls', label: 'Calls', icon: Phone },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare, badge: 'pendingTasks' },
  { href: '/follow-up', label: 'Follow-up', icon: RefreshCcw },
]

export function Sidebar({ role, pendingMessages, pendingTasks, open, onClose, onLeadCreated, profile }: SidebarProps) {
  const pathname = usePathname()
  const badges = { pendingMessages, pendingTasks }
  const [showNewLead, setShowNewLead] = useState(false)

  const allItems = [
    ...nav,
    ...(role !== 'operator' ? [{ href: '/settings', label: 'Configurações', icon: Settings }] : []),
  ] as { href: string; label: string; icon: LucideIcon; badge?: 'pendingMessages' | 'pendingTasks' }[]

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full w-[220px] flex-col pt-5 pb-8 px-4 overflow-y-auto transition-transform lg:translate-x-0',
          'bg-[#f8faf7]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <button onClick={onClose} className="absolute top-4 right-4 lg:hidden text-[#1B3A2D]/40 hover:text-[#1B3A2D]">
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="mb-8 px-1">
          <div className="relative h-[56px] w-[178px] overflow-hidden">
            <Image
              src="/logo.svg"
              alt="Lukhas Brackes"
              fill
              priority
              sizes="178px"
              className="object-contain object-left-top scale-[1.18] -translate-y-2 origin-top-left"
            />
          </div>
          <p className="mt-0.5 pl-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B3A2D]/40">CRM Inteligente</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {allItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
            const badgeKey = 'badge' in item ? item.badge : undefined
            const badgeCount = badgeKey ? badges[badgeKey as keyof typeof badges] : 0

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'rounded-full px-4 py-[9px] my-[1px] transition-all duration-200 flex items-center gap-3',
                  active
                    ? 'bg-[#C8E645] text-[#111827] font-bold'
                    : 'text-[#1B3A2D] hover:bg-[#f2f4f1] group'
                )}
              >
                <item.icon className={cn(
                  'w-5 h-5 shrink-0',
                  !active && 'opacity-70 group-hover:opacity-100'
                )} />
                <span className="text-sm flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className={cn(
                    'ml-auto min-w-[20px] h-[20px] rounded-full text-[10px] font-bold flex items-center justify-center',
                    active ? 'bg-[#1B3A2D]/20 text-[#1B3A2D]' : 'bg-[#C8E645]/30 text-[#1B3A2D]'
                  )}>
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-[#EFEFEF]">
          <button
            onClick={() => setShowNewLead(true)}
            className="w-full bg-[#1B3A2D] text-white py-3 px-4 rounded-full font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>

      </aside>

      <NewLeadModal
        open={showNewLead}
        onOpenChange={setShowNewLead}
        onCreated={onLeadCreated}
      />
    </>
  )
}
