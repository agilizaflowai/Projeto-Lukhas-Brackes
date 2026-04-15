'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, MessageSquare, Phone, AlertTriangle, CheckCircle, Bot } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'message' | 'call' | 'follow_up' | 'success' | 'system'
  title: string
  description: string
  href: string
  read: boolean
  createdAt: Date
}

const NOTIF_ICONS: Record<string, { icon: typeof Bell; bg: string; color: string }> = {
  message: { icon: MessageSquare, bg: 'bg-[#C8E645]/15', color: 'text-[#7A9E00]' },
  call: { icon: Phone, bg: 'bg-[#10B981]/10', color: 'text-[#059669]' },
  follow_up: { icon: AlertTriangle, bg: 'bg-[#F59E0B]/10', color: 'text-[#D97706]' },
  success: { icon: CheckCircle, bg: 'bg-[#10B981]/10', color: 'text-[#059669]' },
  system: { icon: Bot, bg: 'bg-[#F3F4F6]', color: 'text-[#6B7280]' },
}

function formatShortTime(date: Date): string {
  return formatDistanceToNow(date, { locale: ptBR, addSuffix: false })
    .replace('cerca de ', '')
    .replace('menos de um minuto', 'agora')
    .replace(' minutos', 'min').replace(' minuto', 'min')
    .replace(' horas', 'h').replace(' hora', 'h')
    .replace(' dias', 'd').replace(' dia', 'd')
    .replace(' meses', 'M').replace(' mês', 'M')
}

export function NotificationPopover() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const hasLoadedRef = useRef(false)

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length

  const loadNotifications = useCallback(async () => {
    const supabase = createClient()
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const threeDaysLater = new Date(now.getTime() + 3 * 86400000).toISOString()

    const [
      { data: messages },
      { data: calls },
      { data: overdueLeads },
      { data: closedLeads },
      { data: pendingMsgs },
    ] = await Promise.all([
      supabase.from('messages').select('id, lead_id, content, created_at, leads!inner(name, instagram_username)')
        .eq('direction', 'inbound').gte('created_at', dayAgo).order('created_at', { ascending: false }).limit(3),
      supabase.from('calls').select('id, lead_id, scheduled_at, leads!inner(name)')
        .gte('scheduled_at', now.toISOString()).lte('scheduled_at', threeDaysLater)
        .is('result', null).order('scheduled_at', { ascending: true }).limit(3),
      supabase.from('leads').select('id, name, instagram_username, next_follow_up_at')
        .lt('next_follow_up_at', now.toISOString()).eq('is_active', true).eq('stage', 'follow_up').limit(3),
      supabase.from('leads').select('id, name, instagram_username, stage_changed_at')
        .eq('stage', 'fechado').gte('stage_changed_at', dayAgo).order('stage_changed_at', { ascending: false }).limit(1),
      supabase.from('messages').select('id, lead_id, created_at, leads!inner(name)')
        .eq('status', 'pending').order('created_at', { ascending: false }).limit(2),
    ])

    const items: Notification[] = []

    // Messages from leads
    messages?.forEach((m: any) => {
      const leadName = m.leads?.name
      const username = m.leads?.instagram_username
      const displayName = leadName || (username && !username.startsWith('ig_') && !/^\d{10,}$/.test(username) ? `@${username}` : null)
      if (!displayName) return

      items.push({
        id: `msg-${m.id}`,
        type: 'message',
        title: displayName,
        description: m.content?.slice(0, 60) + (m.content?.length > 60 ? '...' : '') || 'Enviou uma mensagem',
        href: `/leads/${m.lead_id}`,
        read: false,
        createdAt: new Date(m.created_at),
      })
    })

    // Upcoming calls
    calls?.forEach((c: any) => {
      const leadName = (c.leads as any)?.name || 'Lead'
      const when = new Date(c.scheduled_at)
      const diffH = Math.round((when.getTime() - now.getTime()) / 3600000)
      const dayLabel = diffH < 24 ? `em ${diffH}h` : `em ${Math.round(diffH / 24)}d`

      items.push({
        id: `call-${c.id}`,
        type: 'call',
        title: `Call com ${leadName}`,
        description: `Agendada ${dayLabel}`,
        href: '/calls',
        read: false,
        createdAt: when,
      })
    })

    // Overdue follow-ups (grouped)
    if (overdueLeads && overdueLeads.length > 0) {
      items.push({
        id: 'followups-overdue',
        type: 'follow_up',
        title: `${overdueLeads.length} follow-up${overdueLeads.length > 1 ? 's' : ''} atrasado${overdueLeads.length > 1 ? 's' : ''}`,
        description: overdueLeads.map((l: any) => l.name || `@${l.instagram_username}`).filter(Boolean).join(', '),
        href: '/follow-up',
        read: false,
        createdAt: now,
      })
    }

    // Closed leads
    closedLeads?.forEach((l: any) => {
      const leadName = l.name || (l.instagram_username && !l.instagram_username.startsWith('ig_') ? `@${l.instagram_username}` : null)
      if (!leadName) return

      items.push({
        id: `closed-${l.id}`,
        type: 'success',
        title: `${leadName} fechou!`,
        description: 'Lead convertido com sucesso',
        href: `/leads/${l.id}`,
        read: false,
        createdAt: new Date(l.stage_changed_at || now),
      })
    })

    // Pending approval messages
    if (pendingMsgs && pendingMsgs.length > 0) {
      items.push({
        id: 'pending-approval',
        type: 'system',
        title: `${pendingMsgs.length} mensagen${pendingMsgs.length > 1 ? 's' : ''} aguardando aprovação`,
        description: 'Verifique a fila de mensagens',
        href: '/messages',
        read: false,
        createdAt: new Date(pendingMsgs[0].created_at),
      })
    }

    // Sort by date, deduplicate
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const unique = items.filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i)
    setNotifications(unique.slice(0, 10))
  }, [])

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleClick(n: Notification) {
    setReadIds(prev => new Set(prev).add(n.id))
    setOpen(false)
    router.push(n.href)
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map(n => n.id)))
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all relative ${
          open ? 'bg-[#F3F4F6] text-[#111827]' : 'hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#374151]'
        }`}
      >
        <Bell className="w-[20px] h-[20px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-[380px] bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden z-50 animate-dropdown-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F5F5F5]">
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-bold text-[#111827]">Notificações</h4>
              {unreadCount > 0 && (
                <span className="min-w-[20px] h-[20px] bg-[#EF4444]/10 text-[#EF4444] text-[11px] font-bold rounded-full flex items-center justify-center px-1.5">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[12px] font-medium text-[#9CA3AF] hover:text-[#111827] transition-colors">
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto dropdown-scroll">
            {notifications.length > 0 ? (
              notifications.map(n => {
                const isUnread = !readIds.has(n.id)
                const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.system
                const Icon = cfg.icon
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-all border-b border-[#F9FAFB] last:border-b-0 hover:bg-[#FAFBFC] ${
                      isUnread ? 'bg-[#C8E645]/[0.03]' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[13px] text-[#111827] truncate ${isUnread ? 'font-bold' : 'font-medium'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-[#C0C7D0] flex-shrink-0 mt-0.5">
                          {formatShortTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#9CA3AF] truncate mt-0.5">{n.description}</p>
                    </div>
                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-[#C8E645] flex-shrink-0 mt-2" />
                    )}
                  </button>
                )
              })
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 text-[#C0C7D0]" />
                </div>
                <p className="text-[13px] font-medium text-[#6B7280]">Nenhuma notificação</p>
                <p className="text-[11px] text-[#C0C7D0] mt-0.5">Tudo em dia por aqui</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-2.5 border-t border-[#F5F5F5]">
              <button
                onClick={() => { setOpen(false); router.push('/messages') }}
                className="w-full text-center text-[12px] font-semibold text-[#7A9E00] hover:text-[#5A6B00] py-1 transition-colors"
              >
                Ver todas as atividades →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
