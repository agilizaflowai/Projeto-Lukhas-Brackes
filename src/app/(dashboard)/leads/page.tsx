'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { cn } from '@/lib/utils'
import { Search, ExternalLink, Users, Plus, Bot } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { STAGE_COLORS } from '@/lib/stage-colors'
import { EmptyState } from '@/components/common/EmptyState'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Lead, LeadStage } from '@/lib/types'

const STAGE_DOT_COLORS: Record<string, string> = {
  novo: '#3B82F6', lead_frio: '#6B7280', rapport: '#A855F7', social_selling: '#EC4899',
  spin: '#F97316', call_agendada: '#FACC15', fechado: '#10B981', perdido: '#EF4444', follow_up: '#06B6D4',
}

const STAGE_BADGE: Record<string, string> = {
  novo: 'bg-[#3B82F6]/10 text-[#2563EB]', lead_frio: 'bg-[#6B7280]/10 text-[#4B5563]',
  rapport: 'bg-[#A855F7]/10 text-[#9333EA]', social_selling: 'bg-[#EC4899]/10 text-[#DB2777]',
  spin: 'bg-[#F97316]/10 text-[#EA580C]', call_agendada: 'bg-[#FACC15]/10 text-[#CA8A04]',
  fechado: 'bg-[#10B981]/10 text-[#059669]', perdido: 'bg-[#EF4444]/10 text-[#DC2626]',
  follow_up: 'bg-[#06B6D4]/10 text-[#0891B2]',
}

const SOURCE_LABELS: Record<string, string> = {
  instagram_comment: 'Comentário', comentario: 'Comentário',
  instagram_story: 'Story Reply', story_reply: 'Story Reply',
  instagram_dm: 'DM Direta', dm_direta: 'DM Direta',
  instagram_follow: 'Seguidor', seguidor: 'Seguidor',
  instagram_like: 'Curtida', curtida: 'Curtida',
  manual: 'Manual', indicacao: 'Indicação',
}

function shortTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { locale: ptBR, addSuffix: false })
    .replace('cerca de ', '').replace('menos de um minuto', 'agora')
    .replace(' minutos', 'min').replace(' minuto', 'min')
    .replace(' horas', 'h').replace(' hora', 'h')
    .replace(' dias', 'd').replace(' dia', 'd')
    .replace(' meses', 'M').replace(' mês', 'M')
}

const PER_PAGE = 20

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('leads').select('*').order('created_at', { ascending: false }).then(({ data }: { data: any }) => {
      if (data) setLeads(data)
      setLoading(false)
    })
  }, [])

  const filtered = leads.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      if (!l.name?.toLowerCase().includes(q) && !l.instagram_username.toLowerCase().includes(q)) return false
    }
    if (filterStage && l.stage !== filterStage) return false
    if (filterSource && l.source !== filterSource && SOURCE_LABELS[l.source || ''] !== SOURCE_LABELS[filterSource]) return false
    if (filterAssigned && l.assigned_to !== filterAssigned) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, filterStage, filterSource, filterAssigned])

  const hasReadableUsername = (u: string) => u && !u.startsWith('ig_') && !/^\d{10,}$/.test(u)

  const stageOptions = Object.entries(STAGE_COLORS).map(([k, v]) => ({
    value: k, label: v.label,
    icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_DOT_COLORS[k] }} />,
  }))

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Leads</h2>
          <p className="text-[#414844] opacity-80 mt-1">
            <span className="text-[#111827] font-semibold">{filtered.length}</span> leads encontrados
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center bg-[#F7F8F9] border border-[#EFEFEF] px-4 py-2 rounded-full w-[280px] focus-within:border-[#C8E645] transition-colors">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-[#374151] w-full ml-2 placeholder-[#9CA3AF] py-0"
            placeholder="Buscar por nome ou @username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <FilterDropdown
          label="Todas etapas"
          options={stageOptions}
          value={filterStage}
          onChange={v => setFilterStage(v)}
        />
        <FilterDropdown
          label="Origem"
          options={[
            { value: 'instagram_comment', label: 'Comentário' },
            { value: 'instagram_story', label: 'Story Reply' },
            { value: 'instagram_dm', label: 'DM Direta' },
            { value: 'instagram_follow', label: 'Seguidor' },
            { value: 'instagram_like', label: 'Curtida' },
            { value: 'manual', label: 'Manual' },
            { value: 'indicacao', label: 'Indicação' },
          ]}
          value={filterSource}
          onChange={v => setFilterSource(v)}
        />
        <FilterDropdown
          label="Responsável"
          options={[
            { value: 'ia', label: 'IA' },
            { value: 'lukhas', label: 'Lukhas' },
            { value: 'assistente', label: 'Assistente' },
          ]}
          value={filterAssigned}
          onChange={v => setFilterAssigned(v)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 skeleton-shimmer rounded-xl" />)}</div>
      ) : (
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFBFC] border-b border-[#F3F4F6]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Lead</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden md:table-cell">Etapa</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden lg:table-cell">Origem</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden lg:table-cell">Responsável</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden md:table-cell">Criado</th>
                <th className="w-[60px] px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(lead => {
                const readable = hasReadableUsername(lead.instagram_username)
                const hasName = !!lead.name
                const displayName = lead.name
                  || (readable ? `@${lead.instagram_username}` : 'Lead sem identificação')
                const displayUser = hasName && readable ? `@${lead.instagram_username}` : ''
                const initials = (lead.name || lead.instagram_username || 'L').slice(0, 2).toUpperCase()

                return (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="border-b border-[#F5F5F5] last:border-b-0 hover:bg-[#FAFBFC] cursor-pointer transition-colors duration-150 group"
                  >
                    {/* Lead */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="md" />
                        <div className="min-w-0">
                          <p className={cn(
                            'text-[13px] truncate max-w-[220px]',
                            !hasName && !readable ? 'text-[#9CA3AF] italic' : 'font-semibold text-[#111827]'
                          )}>{displayName}</p>
                          {displayUser && <p className="text-[11px] text-[#9CA3AF] truncate">{displayUser}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Etapa */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px]',
                        STAGE_BADGE[lead.stage] || 'bg-[#F3F4F6] text-[#6B7280]'
                      )}>
                        <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: STAGE_DOT_COLORS[lead.stage] || '#6B7280' }} />
                        {STAGE_COLORS[lead.stage]?.label || lead.stage}
                      </span>
                    </td>

                    {/* Origem */}
                    <td className="px-5 py-3.5 text-[13px] text-[#6B7280] hidden lg:table-cell">
                      {SOURCE_LABELS[lead.source || ''] || lead.source || '—'}
                    </td>

                    {/* Responsável */}
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {lead.assigned_to === 'ia' ? (
                        <span className="inline-flex items-center gap-1.5 bg-[#C8E645]/15 text-[#62721D] text-[11px] font-bold px-2.5 py-1 rounded-[6px]">
                          <Bot className="w-3 h-3" /> IA
                        </span>
                      ) : lead.assigned_to === 'lukhas' ? (
                        <span className="inline-flex items-center gap-1.5 bg-[#1B3A2D]/8 text-[#1B3A2D] text-[11px] font-bold px-2.5 py-1 rounded-[6px]">
                          Lukhas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-[#3B82F6]/10 text-[#2563EB] text-[11px] font-bold px-2.5 py-1 rounded-[6px]">
                          Assist.
                        </span>
                      )}
                    </td>

                    {/* Criado */}
                    <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF] hidden md:table-cell">
                      {shortTime(lead.created_at)}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {readable && (
                          <a
                            href={`https://instagram.com/${lead.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6}><EmptyState icon={Users} title="Nenhum lead encontrado" description="Tente ajustar os filtros ou aguarde novos leads." /></td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#F3F4F6]">
              <span className="text-[12px] text-[#9CA3AF]">
                Mostrando {(safePage - 1) * PER_PAGE + 1}-{Math.min(safePage * PER_PAGE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={safePage === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg disabled:opacity-40 transition-all"
                >
                  &larr; Anterior
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
                  const p = start + i
                  if (p > totalPages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-[12px] font-medium transition-all',
                        p === safePage ? 'bg-[#C8E645] text-[#111827] font-bold' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                      )}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  disabled={safePage === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg disabled:opacity-40 transition-all"
                >
                  Próximo &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
