'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { EmptyState } from '@/components/common/EmptyState'
import { getActivityConfig, getActivityDetail } from '@/lib/activity-config'
import { ArrowLeft, Activity as ActivityIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  lead_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
  lead_name: string | null
  lead_username: string | null
  lead_pic: string | null
}

const PAGE_SIZE = 50

const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: 'lead_created', label: 'Entrou no funil' },
  { value: 'lead_enriched', label: 'Perfil enriquecido' },
  { value: 'stage_changed', label: 'Mudou de etapa' },
  { value: 'message_approved', label: 'Mensagem aprovada' },
  { value: 'message_rejected', label: 'Mensagem rejeitada' },
  { value: 'human_takeover', label: 'Humano assumiu' },
  { value: 'call_scheduled', label: 'Call agendada' },
  { value: 'note_added', label: 'Nota adicionada' },
]

function relativeTime(iso: string): string {
  const date = new Date(iso)
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 0) return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function ActivitiesPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filterAction, setFilterAction] = useState('')

  const load = useCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    const supabase = createClient()
    const offset = reset ? 0 : activities.length

    let query = supabase
      .from('activity_log')
      .select('id, lead_id, action, details, created_at, lead:leads(name, instagram_username, profile_pic_url)')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (filterAction) query = query.eq('action', filterAction)

    const { data } = await query
    const rows: Activity[] = (data || []).map((a: Record<string, unknown>) => {
      const lead = (a.lead as { name?: string; instagram_username?: string; profile_pic_url?: string } | null)
      const details = a.details as { lead_name?: string; lead_username?: string } | null
      return {
        id: a.id as string,
        lead_id: a.lead_id as string | null,
        action: a.action as string,
        details: a.details as Record<string, unknown> | null,
        created_at: a.created_at as string,
        lead_name: lead?.name || details?.lead_name || null,
        lead_username: lead?.instagram_username || details?.lead_username || null,
        lead_pic: lead?.profile_pic_url || null,
      }
    })

    setActivities(prev => reset ? rows : [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction])

  useEffect(() => { load(true) }, [filterAction])

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280] hover:text-[#111827] mb-5 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
        Voltar ao dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Atividades</h2>
          <p className="text-[#414844] opacity-80 mt-1">Histórico completo de ações no CRM</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <FilterDropdown
          label="Tipo"
          options={ACTION_FILTERS}
          value={filterAction}
          onChange={v => setFilterAction(v)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-16 rounded-[12px]" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
          <EmptyState icon={ActivityIcon} title="Nenhuma atividade" description="Atividades aparecem aqui quando ações são registradas no CRM" />
        </div>
      ) : (
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="divide-y divide-[#F5F5F5]">
            {activities.map(a => {
              const cfg = getActivityConfig(a.action, a.details)
              const displayName = (a.lead_name && !a.lead_name.startsWith('ig_'))
                ? a.lead_name
                : (a.lead_username && !a.lead_username.startsWith('ig_'))
                  ? `@${a.lead_username}`
                  : 'Lead'
              const detail = getActivityDetail(a.action, a.details)

              return (
                <div
                  key={a.id}
                  onClick={() => a.lead_id && router.push(`/leads/${a.lead_id}`)}
                  className={cn(
                    'flex items-center gap-3 px-5 py-3.5 transition-colors',
                    a.lead_id ? 'cursor-pointer hover:bg-[#FAFBFC]' : '',
                  )}
                >
                  {a.lead_id ? (
                    <LeadAvatar name={a.lead_name} username={a.lead_username} photoUrl={a.lead_pic} size="md" />
                  ) : (
                    <div className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0', cfg.badgeColor.split(' ')[0])}>
                      <cfg.icon className={cn('w-4 h-4', cfg.badgeColor.split(' ')[1])} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#111827] truncate">{displayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[12px] text-[#9CA3AF] truncate">{detail}</p>
                      <span className="text-[#E5E7EB]">&middot;</span>
                      <span className="text-[11px] text-[#C0C7D0] flex-shrink-0">{relativeTime(a.created_at)}</span>
                    </div>
                  </div>

                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0', cfg.badgeColor)}>
                    {cfg.badge}
                  </span>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div className="border-t border-[#F3F4F6] px-5 py-4 flex justify-center">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="px-5 py-2.5 text-[13px] font-semibold text-[#1B3A2D] bg-[#C8E645]/15 hover:bg-[#C8E645]/25 rounded-full transition-all disabled:opacity-50"
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
