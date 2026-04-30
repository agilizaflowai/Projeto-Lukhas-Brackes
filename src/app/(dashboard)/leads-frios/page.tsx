'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { cn, getLeadDisplayName, getLeadDisplayUsername } from '@/lib/utils'
import {
  Search, Snowflake, Bot, Copy, Eye, EyeOff, Check, Users,
  UserCheck, CheckCircle, AlertTriangle, MessageSquare, Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Lead } from '@/lib/types'

/* ── helpers ───────────────────────────────────────────── */

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

function isValidInstagramUsername(u: string | undefined | null): boolean {
  if (!u) return false
  return !u.startsWith('ig_') && !/^\d{10,}$/.test(u)
}

function getSuggestionForLead(lead: Lead): string {
  const name = lead.name?.split(' ')[0] || ''
  const bio = (lead.bio || '').toLowerCase()

  if (lead.source === 'instagram_like' || lead.source === 'curtida') {
    return `Oi${name ? ` ${name}` : ''}! Vi que curtiu meu conteúdo 😊 Tá treinando atualmente ou querendo começar?`
  }
  if (bio.includes('fitness') || bio.includes('treino') || bio.includes('crossfit')) {
    return `Oi${name ? ` ${name}` : ''}! Vi que tu curte fitness também 💪 Treina há quanto tempo?`
  }
  if (bio.includes('nutri')) {
    return `Oi${name ? ` ${name}` : ''}! Vi teu perfil, muito legal! Tu é da área de nutrição? Que demais!`
  }
  if (bio.includes('empreend') || bio.includes('empresár') || bio.includes('ceo')) {
    return `Oi${name ? ` ${name}` : ''}! Vi que tu é empreendedor(a), correria né? Como tá a saúde no meio disso tudo?`
  }
  return `Oi${name ? ` ${name}` : ''}! Obrigado por me seguir 🙌 Vi teu perfil e achei muito legal. Treina atualmente?`
}

const PER_PAGE = 15

const SOURCE_MAP: Record<string, string> = {
  instagram_follow: 'seguidor', seguidor: 'seguidor',
  instagram_like: 'curtida', curtida: 'curtida',
  instagram_comment: 'comentario', comentario: 'comentario',
  instagram_story: 'story', story_reply: 'story',
  instagram_dm: 'dm', dm_direta: 'dm',
}

/* ── page ──────────────────────────────────────────────── */

export default function LeadsFriosPage() {
  const { profile } = useProfile()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterGoal, setFilterGoal] = useState('')
  const [filterFollowers, setFilterFollowers] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [hideAbordados, setHideAbordados] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [exitingId, setExitingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({})
  const [abordados, setAbordados] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  // Sugest\u00f5es geradas pela IA (vindas de tasks.suggested_text), por lead_id
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({})

  const supabase = createClient()

  const loadLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('stage', 'lead_frio')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) {
      setLeads(data)

      // Busca em batch as tasks pendentes com sugest\u00e3o da IA pra esses leads
      const leadIds = data.map(l => l.id)
      if (leadIds.length > 0) {
        try {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('lead_id, suggested_text, created_at')
            .in('lead_id', leadIds)
            .eq('status', 'pending')
            .not('suggested_text', 'is', null)
            .order('created_at', { ascending: false })

          // Mant\u00e9m apenas a sugest\u00e3o mais recente por lead
          const map: Record<string, string> = {}
          for (const t of tasks || []) {
            if (t.lead_id && t.suggested_text && !map[t.lead_id]) {
              map[t.lead_id] = t.suggested_text
            }
          }
          setAiSuggestions(map)
        } catch (err) {
          console.warn('Falha ao buscar suggested_text das tasks:', err)
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

  /* ── filters ── */

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

  /* ── actions ── */

  // Prioridade: edi\u00e7\u00e3o local > sugest\u00e3o real da IA (task) > template client-side
  function getLeadSuggestion(lead: Lead): string {
    return editedTexts[lead.id] || aiSuggestions[lead.id] || getSuggestionForLead(lead)
  }

  async function copyAndOpenChat(lead: Lead) {
    await navigator.clipboard.writeText(getLeadSuggestion(lead))
    setCopiedId(lead.id)

    setTimeout(() => {
      setCopiedId(null)
      router.push(`/leads/${lead.id}?tab=conversa`)
    }, 800)
  }

  async function confirmAndMarkApproached(leadId: string) {
    if (confirmingId !== leadId) {
      setConfirmingId(leadId)
      setTimeout(() => setConfirmingId(prev => prev === leadId ? null : prev), 3000)
      return
    }
    setConfirmingId(null)
    setExitingId(leadId)

    await supabase.from('leads').update({
      stage: 'rapport',
      stage_changed_at: new Date().toISOString(),
    }).eq('id', leadId)

    const leadForLog = leads.find(l => l.id === leadId)
    await supabase.from('activity_log').insert({
      lead_id: leadId,
      action: 'stage_changed',
      details: { from: 'lead_frio', to: 'rapport', method: 'manual_approach', lead_name: leadForLog?.name || leadForLog?.instagram_username || 'Lead' },
      created_by: profile?.name || 'admin',
    })

    setTimeout(() => {
      setAbordados(prev => new Set(prev).add(leadId))
      setExitingId(null)
    }, 400)
  }

  const abordadosCount = abordados.size

  /* ── render ──────────────────────────────────────────── */

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
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[180px] skeleton-shimmer rounded-[16px]" />)}</div>
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
          <div className="space-y-3">
            {paginated.map(lead => {
              const isAbordado = abordados.has(lead.id)
              const isExiting = exitingId === lead.id
              const isCopied = copiedId === lead.id
              const hasValidUsername = isValidInstagramUsername(lead.instagram_username)
              const displayName = getLeadDisplayName(lead)
              const displayUsername = getLeadDisplayUsername(lead)
              const suggestion = aiSuggestions[lead.id] || getSuggestionForLead(lead)

              return (
                <div
                  key={lead.id}
                  className={cn(
                    'bg-white rounded-[16px] border border-[#EFEFEF] overflow-hidden',
                    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]',
                    'transition-all duration-300',
                    isExiting && 'opacity-0 translate-x-4 scale-[0.98]',
                    isAbordado && 'opacity-50',
                  )}
                >
                  {/* Header: lead info */}
                  <div className="flex items-center gap-4 p-5 pb-3">
                    <Link href={`/leads/${lead.id}`} className="flex-shrink-0">
                      <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="md" className="hover:ring-2 hover:ring-[#C8E645]/30 transition-all" />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/leads/${lead.id}`} className="text-[14px] font-bold text-[#111827] truncate hover:underline">
                          {displayName}
                        </Link>
                        {hasValidUsername && displayUsername && (
                          <span className="text-[11px] text-[#9CA3AF] flex-shrink-0">{displayUsername}</span>
                        )}
                        {isAbordado && (
                          <span className="text-[10px] font-bold text-[#059669] bg-[#10B981]/10 px-2 py-0.5 rounded-full flex-shrink-0">ABORDADO</span>
                        )}
                      </div>

                      {lead.bio && (
                        <p className="text-[12px] text-[#6B7280] truncate mt-0.5">{lead.bio}</p>
                      )}

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
                            <UserCheck className="w-3 h-3" /> Te segue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                            Não te segue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sugestão da IA — SEMPRE visível */}
                  {!isAbordado && (
                    <div className="mx-5 mb-3">
                      <div className="bg-[#F7F8F9] rounded-[12px] border border-[#EFEFEF] p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-4 h-4 rounded bg-[#C8E645]/20 flex items-center justify-center">
                            <Bot className="w-2.5 h-2.5 text-[#7A9E00]" />
                          </div>
                          <span className="text-[10px] font-bold text-[#7A9E00] uppercase tracking-[0.04em]">Sugestão da IA</span>
                        </div>
                        {editingId === lead.id ? (
                          <textarea
                            value={editedTexts[lead.id] || suggestion}
                            onChange={e => setEditedTexts(prev => ({ ...prev, [lead.id]: e.target.value }))}
                            className="w-full text-[13px] text-[#374151] leading-relaxed bg-white border border-[#EFEFEF] rounded-[8px] p-3 focus:outline-none focus:border-[#C8E645] focus:ring-2 focus:ring-[#C8E645]/20 resize-none transition-all"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <p className="text-[13px] text-[#374151] leading-relaxed">{suggestion}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Aviso: sem username válido */}
                  {!isAbordado && !hasValidUsername && (
                    <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 bg-[#F59E0B]/5 rounded-[10px] border border-[#F59E0B]/10">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] flex-shrink-0" />
                      <p className="text-[11px] text-[#D97706]">
                        Perfil não identificado — abordagem só é possível se encontrar o @ manualmente
                      </p>
                    </div>
                  )}

                  {/* Ações */}
                  {!isAbordado && (
                    <div className="flex items-center gap-2 px-5 py-3 bg-[#FAFBFC] border-t border-[#F5F5F5]">
                      <button
                        onClick={() => copyAndOpenChat(lead)}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all active:scale-95',
                          isCopied
                            ? 'bg-[#10B981] text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
                            : 'bg-[#C8E645] text-[#111827] shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px',
                        )}
                      >
                        {isCopied ? (
                          <><Check className="w-3.5 h-3.5" /> Copiado! Abrindo chat...</>
                        ) : (
                          <><MessageSquare className="w-3.5 h-3.5" /> Copiar e abrir chat</>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (editingId === lead.id) {
                            setEditingId(null)
                          } else {
                            if (!editedTexts[lead.id]) {
                              setEditedTexts(prev => ({ ...prev, [lead.id]: suggestion }))
                            }
                            setEditingId(lead.id)
                          }
                        }}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-2 border text-[12px] font-semibold rounded-full active:scale-95 transition-all',
                          editingId === lead.id
                            ? 'bg-[#C8E645]/10 border-[#C8E645]/30 text-[#3D4F00]'
                            : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]',
                        )}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {editingId === lead.id ? 'Pronto' : 'Editar msg'}
                      </button>

                      <button
                        onClick={() => confirmAndMarkApproached(lead.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-2 border text-[12px] font-semibold rounded-full active:scale-95 transition-all',
                          confirmingId === lead.id
                            ? 'bg-[#10B981] border-[#10B981] text-white'
                            : 'border-[#E5E7EB] text-[#374151] hover:bg-[#10B981]/5 hover:border-[#10B981]/30 hover:text-[#059669]',
                        )}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {confirmingId === lead.id ? 'Confirmar?' : 'Já abordei'}
                      </button>

                      <Link
                        href={`/leads/${lead.id}`}
                        className="ml-auto flex items-center gap-1.5 px-3.5 py-2 border border-[#E5E7EB] text-[#6B7280] text-[12px] font-medium rounded-full hover:bg-[#F3F4F6] hover:text-[#111827] transition-all"
                      >
                        Ver ficha &rarr;
                      </Link>
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
