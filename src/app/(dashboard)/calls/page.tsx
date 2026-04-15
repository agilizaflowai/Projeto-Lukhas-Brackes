'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { cn, getLeadDisplayName } from '@/lib/utils'
import { Search, Phone, ChevronRight } from 'lucide-react'
import { format, isAfter, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from '@/components/common/EmptyState'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Call } from '@/lib/types'

const PER_PAGE = 20

function getInitials(name?: string | null): string {
  if (!name) return 'L'
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export default function CallsPage() {
  const router = useRouter()
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterResult, setFilterResult] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('calls')
      .select('*, lead:leads(id, name, instagram_username, profile_pic_url)')
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .then(({ data }: { data: any }) => {
        if (data) setCalls(data as Call[])
        setLoading(false)
      })
  }, [])

  // Filtering
  const filtered = calls.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !c.lead?.name?.toLowerCase().includes(q) &&
        !c.lead?.instagram_username?.toLowerCase().includes(q)
      ) return false
    }
    if (filterResult) {
      if (filterResult === 'pending') {
        if (c.result) return false
      } else {
        if (c.result !== filterResult) return false
      }
    }
    if (filterPeriod && filterPeriod !== 'all' && c.scheduled_at) {
      const days = filterPeriod === '7d' ? 7 : filterPeriod === '30d' ? 30 : 90
      if (!isAfter(new Date(c.scheduled_at), subDays(new Date(), days))) return false
    }
    return true
  })

  // Stats
  const fechadas = calls.filter(c => c.result === 'fechou').length
  const naoFechadas = calls.filter(c => c.result === 'nao_fechou').length
  const agendadas = calls.filter(c => !c.result).length
  const scores = calls.filter(c => c.ai_analysis?.score != null).map(c => c.ai_analysis!.score)
  const scoreMedio = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, filterResult, filterPeriod])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Calls</h2>
          <p className="text-[#414844] opacity-80 mt-1">
            <span className="font-semibold text-[#111827]">{calls.length}</span> calls registradas
          </p>
        </div>

        {/* Mini stats */}
        <div className="flex items-center bg-white rounded-[14px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-r border-[#F3F4F6]">
            <div className="w-2 h-2 rounded-full bg-[#10B981]" />
            <div>
              <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Fechadas</p>
              <p className="text-[18px] font-bold text-[#111827] tabular-nums">{fechadas}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 border-r border-[#F3F4F6]">
            <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <div>
              <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Não fechadas</p>
              <p className="text-[18px] font-bold text-[#111827] tabular-nums">{naoFechadas}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 border-r border-[#F3F4F6]">
            <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            <div>
              <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Agendadas</p>
              <p className="text-[18px] font-bold text-[#111827] tabular-nums">{agendadas}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="w-2 h-2 rounded-full bg-[#C8E645]" />
            <div>
              <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Score médio</p>
              <p className="text-[18px] font-bold text-[#111827] tabular-nums">
                {scoreMedio}<span className="text-[13px] font-normal text-[#C0C7D0] ml-0.5">/10</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center bg-[#F7F8F9] border border-[#EFEFEF] px-4 py-2 rounded-full w-[240px] focus-within:border-[#C8E645] transition-colors">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-[#374151] w-full ml-2 placeholder-[#9CA3AF] py-0"
            placeholder="Buscar por lead..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <FilterDropdown
          label="Resultado"
          options={[
            { value: 'fechou', label: 'Fechou', icon: <div className="w-2 h-2 rounded-full bg-[#10B981]" /> },
            { value: 'nao_fechou', label: 'Não fechou', icon: <div className="w-2 h-2 rounded-full bg-[#EF4444]" /> },
            { value: 'reagendar', label: 'Reagendar', icon: <div className="w-2 h-2 rounded-full bg-[#F59E0B]" /> },
            { value: 'no_show', label: 'No-show', icon: <div className="w-2 h-2 rounded-full bg-[#6B7280]" /> },
            { value: 'pending', label: 'Agendada', icon: <div className="w-2 h-2 rounded-full bg-[#3B82F6]" /> },
          ]}
          value={filterResult}
          onChange={v => setFilterResult(v)}
        />
        <FilterDropdown
          label="Período"
          options={[
            { value: '7d', label: 'Últimos 7 dias' },
            { value: '30d', label: 'Últimos 30 dias' },
            { value: '90d', label: 'Últimos 3 meses' },
            { value: 'all', label: 'Todas' },
          ]}
          value={filterPeriod}
          onChange={v => setFilterPeriod(v)}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 skeleton-shimmer rounded-xl" />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C8E645]/10 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-7 h-7 text-[#C8E645]" />
          </div>
          <h3 className="text-[16px] font-bold text-[#111827] mb-1">Nenhuma call registrada</h3>
          <p className="text-[13px] text-[#9CA3AF]">Calls aparecerão aqui quando forem agendadas pelo pipeline</p>
        </div>
      ) : (
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFBFC] border-b border-[#F3F4F6]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Lead</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden md:table-cell">Data</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden lg:table-cell">Duração</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden md:table-cell">Score</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Resultado</th>
                <th className="w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(call => (
                <tr
                  key={call.id}
                  onClick={() => router.push(`/calls/${call.id}`)}
                  className="border-b border-[#F5F5F5] last:border-b-0 hover:bg-[#FAFBFC] cursor-pointer transition-colors duration-150 group"
                >
                  {/* Lead */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <LeadAvatar name={call.lead?.name || null} username={call.lead?.instagram_username} photoUrl={call.lead?.profile_pic_url || null} size="md" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827] truncate max-w-[200px]">
                          {call.lead ? getLeadDisplayName(call.lead) : 'Lead'}
                        </p>
                        {call.lead?.instagram_username && (
                          <p className="text-[11px] text-[#9CA3AF] truncate">
                            @{call.lead.instagram_username}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Data */}
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-[13px] text-[#374151]">
                      {call.scheduled_at
                        ? format(new Date(call.scheduled_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '—'}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {call.scheduled_at
                        ? format(new Date(call.scheduled_at), 'HH:mm')
                        : ''}
                    </p>
                  </td>

                  {/* Duração */}
                  <td className="px-5 py-4 text-[13px] text-[#6B7280] hidden lg:table-cell">
                    {call.duration_minutes
                      ? `${call.duration_minutes} min`
                      : <span className="text-[#C0C7D0]">—</span>}
                  </td>

                  {/* Score */}
                  <td className="px-5 py-4 hidden md:table-cell">
                    {call.ai_analysis?.score != null ? (
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-[14px] font-bold tabular-nums',
                          call.ai_analysis.score >= 7 ? 'text-[#10B981]'
                            : call.ai_analysis.score >= 4 ? 'text-[#F59E0B]'
                            : 'text-[#EF4444]'
                        )}>
                          {call.ai_analysis.score}
                        </span>
                        <div className="w-[60px] h-[4px] bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              call.ai_analysis.score >= 7 ? 'bg-[#10B981]'
                                : call.ai_analysis.score >= 4 ? 'bg-[#F59E0B]'
                                : 'bg-[#EF4444]'
                            )}
                            style={{ width: `${call.ai_analysis.score * 10}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[#C0C7D0]">—</span>
                    )}
                  </td>

                  {/* Resultado */}
                  <td className="px-5 py-4">
                    {call.result === 'fechou' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#10B981]/10 text-[#059669]">
                        <div className="w-[5px] h-[5px] rounded-full bg-[#10B981]" />
                        Fechou
                      </span>
                    )}
                    {call.result === 'nao_fechou' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#EF4444]/10 text-[#DC2626]">
                        <div className="w-[5px] h-[5px] rounded-full bg-[#EF4444]" />
                        Não fechou
                      </span>
                    )}
                    {call.result === 'reagendar' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#F59E0B]/10 text-[#D97706]">
                        <div className="w-[5px] h-[5px] rounded-full bg-[#F59E0B]" />
                        Reagendar
                      </span>
                    )}
                    {call.result === 'no_show' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#6B7280]/10 text-[#4B5563]">
                        <div className="w-[5px] h-[5px] rounded-full bg-[#6B7280]" />
                        No-show
                      </span>
                    )}
                    {!call.result && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#3B82F6]/10 text-[#2563EB]">
                        <div className="w-[5px] h-[5px] rounded-full bg-[#3B82F6] animate-pulse" />
                        Agendada
                      </span>
                    )}
                  </td>

                  {/* Ação */}
                  <td className="px-5 py-4">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-[#C0C7D0]" />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon={Phone} title="Nenhuma call encontrada" description="Tente ajustar os filtros." />
                  </td>
                </tr>
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
