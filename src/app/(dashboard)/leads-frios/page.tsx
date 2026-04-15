'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { cn, getLeadDisplayName, getLeadDisplayUsername } from '@/lib/utils'
import { Search, ExternalLink, Snowflake, MessageSquare, CheckCircle, Bot, Copy, Eye, EyeOff, Check, Users, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Lead } from '@/lib/types'

function getTagStyle(tag: string): string {
  const t = tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (['emagrecer', 'emagrecimento'].some(k => t.includes(k))) return 'bg-[#D7F5E1] text-[#006E33]'
  if (['hipertrofia', 'massa'].some(k => t.includes(k))) return 'bg-[#E0F2FE] text-[#0369A1]'
  if (['saude', 'qualidade'].some(k => t.includes(k))) return 'bg-[#FEF3C7] text-[#92400E]'
  if (['performance', 'atleta'].some(k => t.includes(k))) return 'bg-[#FEE2E2] text-[#991B1B]'
  if (['mae', 'gestante', 'solo'].some(k => t.includes(k))) return 'bg-[#F3E8FF] text-[#7C3AED]'
  if (['empresario', 'executivo'].some(k => t.includes(k))) return 'bg-[#FFF7ED] text-[#C2410C]'
  return 'bg-[#F3F4F6] text-[#374151]'
}

function getSugestao(lead: Lead): string {
  const nome = lead.name?.split(' ')[0] || ''
  if (lead.source === 'instagram_like' || lead.source === 'curtida') {
    return `Oi${nome ? ` ${nome}` : ''}! Vi que curtiu meu conteúdo 😊 Tá treinando atualmente ou querendo começar?`
  }
  return `Oi${nome ? ` ${nome}` : ''}! Obrigado por me seguir 🙌 Vi que você se interessa por fitness. Treina atualmente?`
}

const PER_PAGE = 15

const SOURCE_MAP: Record<string, string> = {
  instagram_follow: 'seguidor', seguidor: 'seguidor',
  instagram_like: 'curtida', curtida: 'curtida',
  instagram_comment: 'comentario', comentario: 'comentario',
  instagram_story: 'story', story_reply: 'story',
  instagram_dm: 'dm', dm_direta: 'dm',
}

export default function LeadsFriosPage() {
  const { profile } = useProfile()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterGoal, setFilterGoal] = useState('')
  const [filterFollowers, setFilterFollowers] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [hideAbordados, setHideAbordados] = useState(true)
  const [expandedSugestao, setExpandedSugestao] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [abordados, setAbordados] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)

  const supabase = createClient()

  const loadLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('stage', 'lead_frio')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) setLeads(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

  const hasReadableUsername = (u: string) => u && !u.startsWith('ig_') && !/^\d{10,}$/.test(u)

  const filtered = leads.filter(l => {
    if (hideAbordados && abordados.has(l.id)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.name?.toLowerCase().includes(q) && !l.instagram_username.toLowerCase().includes(q)) return false
    }
    if (filterGender && l.gender !== filterGender) return false
    if (filterGoal && l.goal !== filterGoal) return false
    if (filterSource) {
      const normalized = SOURCE_MAP[l.source || ''] || l.source
      if (normalized !== filterSource) return false
    }
    if (filterFollowers && l.follower_count != null) {
      const fc = l.follower_count
      if (filterFollowers === '0-500' && fc > 500) return false
      if (filterFollowers === '500-1000' && (fc < 500 || fc > 1000)) return false
      if (filterFollowers === '1000-5000' && (fc < 1000 || fc > 5000)) return false
      if (filterFollowers === '5000+' && fc < 5000) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, filterGender, filterGoal, filterFollowers, filterSource, hideAbordados])

  async function marcarAbordado(leadId: string) {
    setAbordados(prev => new Set(prev).add(leadId))
    setExpandedSugestao(null)

    await supabase.from('leads').update({
      stage: 'rapport',
      stage_changed_at: new Date().toISOString(),
    }).eq('id', leadId)

    const leadForLog = leads.find(l => l.id === leadId)
    await supabase.from('activity_log').insert({
      lead_id: leadId,
      action: 'stage_changed',
      details: { from: 'lead_frio', to: 'rapport', method: 'manual', lead_name: leadForLog?.name || leadForLog?.instagram_username || 'Lead' },
      created_by: profile?.name || 'admin',
    })
  }

  async function copySugestao(lead: Lead) {
    await navigator.clipboard.writeText(getSugestao(lead))
    setCopied(lead.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const abordadosCount = abordados.size

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Leads Frios</h2>
          <p className="text-[#414844] opacity-80 mt-1">
            <span className="font-semibold text-[#111827]">{leads.length}</span> leads que ainda não entraram no funil ativo
          </p>
        </div>

        {leads.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[12px] text-[#9CA3AF]">Abordados</p>
              <p className="text-[18px] font-bold text-[#111827]">
                {abordadosCount} <span className="text-[14px] font-normal text-[#9CA3AF]">/ {leads.length}</span>
              </p>
            </div>
            <div className="w-[100px] h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C8E645] rounded-full transition-all duration-500"
                style={{ width: `${leads.length > 0 ? (abordadosCount / leads.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center bg-[#F7F8F9] border border-[#EFEFEF] px-4 py-2 rounded-full w-[260px] focus-within:border-[#C8E645] transition-colors">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-[14px] text-[#374151] w-full ml-2 placeholder-[#9CA3AF] py-0"
            placeholder="Buscar por nome ou @username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <FilterDropdown
          label="Gênero"
          options={[
            { value: 'F', label: 'Feminino' },
            { value: 'M', label: 'Masculino' },
          ]}
          value={filterGender}
          onChange={v => setFilterGender(v)}
        />

        <FilterDropdown
          label="Objetivo"
          options={[
            { value: 'emagrecer', label: 'Emagrecer' },
            { value: 'hipertrofia', label: 'Hipertrofia' },
            { value: 'saude', label: 'Saúde' },
            { value: 'performance', label: 'Performance' },
          ]}
          value={filterGoal}
          onChange={v => setFilterGoal(v)}
        />

        <FilterDropdown
          label="Seguidores"
          options={[
            { value: '0-500', label: 'Até 500' },
            { value: '500-1000', label: '500 - 1.000' },
            { value: '1000-5000', label: '1.000 - 5.000' },
            { value: '5000+', label: '5.000+' },
          ]}
          value={filterFollowers}
          onChange={v => setFilterFollowers(v)}
        />

        <FilterDropdown
          label="Origem"
          options={[
            { value: 'seguidor', label: 'Seguidor', icon: <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> },
            { value: 'curtida', label: 'Curtida', icon: <div className="w-2 h-2 rounded-full bg-[#EC4899]" /> },
          ]}
          value={filterSource}
          onChange={v => setFilterSource(v)}
        />

        <button
          onClick={() => setHideAbordados(!hideAbordados)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium border transition-all',
            hideAbordados
              ? 'bg-[#C8E645]/10 border-[#C8E645]/30 text-[#3D4F00]'
              : 'bg-white border-[#E5E7EB] text-[#6B7280]',
          )}
        >
          {hideAbordados ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {hideAbordados ? 'Ocultando abordados' : 'Mostrando abordados'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 skeleton-shimmer rounded-[16px]" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#06B6D4]/10 flex items-center justify-center mx-auto mb-4">
            <Snowflake className="w-7 h-7 text-[#06B6D4]" />
          </div>
          <h3 className="text-[16px] font-bold text-[#111827] mb-1">Nenhum lead frio</h3>
          <p className="text-[13px] text-[#9CA3AF]">Todos os leads frios já foram abordados ou filtrados</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map(lead => {
              const isAbordado = abordados.has(lead.id)
              const readable = hasReadableUsername(lead.instagram_username)
              const displayName = getLeadDisplayName(lead)
              const displayUsername = getLeadDisplayUsername(lead)
              const initials = displayName.replace('@', '').slice(0, 2).toUpperCase()
              const normalizedSource = SOURCE_MAP[lead.source || ''] || lead.source
              const isCurtida = normalizedSource === 'curtida'

              return (
                <div
                  key={lead.id}
                  className={cn(
                    'bg-white rounded-[16px] border border-[#EFEFEF] p-5',
                    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]',
                    'hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.09)]',
                    'transition-all duration-200',
                    isAbordado && 'opacity-50',
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar — clickable */}
                    <Link href={`/leads/${lead.id}`} className="flex-shrink-0">
                      <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="lg" className="hover:ring-2 hover:ring-[#C8E645]/30 transition-all" />
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/leads/${lead.id}`} className={cn('text-[14px] font-bold text-[#111827] truncate hover:underline', isAbordado && 'line-through')}>
                          {displayName}
                        </Link>
                        {displayUsername && (
                          <span className="text-[12px] text-[#9CA3AF] flex-shrink-0">{displayUsername}</span>
                        )}
                        {isAbordado && (
                          <span className="text-[10px] font-bold text-[#059669] bg-[#10B981]/10 px-2 py-0.5 rounded-full flex-shrink-0">ABORDADO</span>
                        )}
                      </div>

                      {lead.bio && (
                        <p className="text-[13px] text-[#6B7280] mt-0.5 line-clamp-1">{lead.bio}</p>
                      )}

                      {/* Metadata pills */}
                      <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                        {lead.follower_count != null && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                            <Users className="w-3 h-3" />
                            {lead.follower_count >= 1000
                              ? `${(lead.follower_count / 1000).toFixed(1).replace('.0', '')}k`
                              : lead.follower_count}
                          </span>
                        )}
                        {lead.follows_lukhas ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#059669] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" />
                            Te segue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                            Não te segue
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isAbordado ? (
                        <>
                          <button
                            onClick={() => setExpandedSugestao(expandedSugestao === lead.id ? null : lead.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#C8E645] text-[#111827] text-[12px] font-bold rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Msg sugerida
                          </button>
                          {readable && (
                            <a
                              href={`https://instagram.com/${lead.instagram_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] text-[#9CA3AF] text-[12px] font-medium rounded-full hover:bg-[#F3F4F6] hover:text-[#374151] transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Instagram
                            </a>
                          )}
                          <button
                            onClick={() => marcarAbordado(lead.id)}
                            className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] text-[#6B7280] text-[12px] font-semibold rounded-full hover:bg-[#10B981]/5 hover:border-[#10B981]/30 hover:text-[#059669] active:scale-95 transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Já abordei
                          </button>
                        </>
                      ) : (
                        <span className="text-[12px] text-[#9CA3AF] italic">Abordado</span>
                      )}
                    </div>
                  </div>

                  {/* Sugestão expandida */}
                  {expandedSugestao === lead.id && !isAbordado && (
                    <div className="mt-4 pt-4 border-t border-[#F3F4F6] animate-dropdown-in">
                      <div className="bg-[#F7F8F9] rounded-[12px] p-4 border border-[#EFEFEF]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-md bg-[#C8E645]/20 flex items-center justify-center">
                            <Bot className="w-3 h-3 text-[#7A9E00]" />
                          </div>
                          <span className="text-[11px] font-bold text-[#7A9E00]">SUGESTÃO DA IA</span>
                        </div>
                        <p className="text-[14px] text-[#374151] leading-relaxed mb-3">
                          {getSugestao(lead)}
                        </p>
                        <button
                          onClick={() => copySugestao(lead)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8E645] text-[#111827] text-[12px] font-bold rounded-full hover:bg-[#AECF1E] active:scale-95 transition-all"
                        >
                          {copied === lead.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied === lead.id ? 'Copiado!' : 'Copiar texto'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
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
                        p === safePage ? 'bg-[#C8E645] text-[#111827] font-bold' : 'text-[#6B7280] hover:bg-[#F3F4F6]',
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
        </>
      )}
    </div>
  )
}
