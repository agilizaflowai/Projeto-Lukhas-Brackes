'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, getLeadDisplayName } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, ArrowUpRight, FileText, ThumbsUp, AlertTriangle, ShieldAlert,
  XCircle, Bot, Link2, Pencil, Search, Check, X, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Call, CallResult } from '@/lib/types'

interface LeadSearchResult {
  id: string
  name: string | null
  instagram_username: string | null
  profile_pic_url: string | null
}

function getInitials(name?: string | null): string {
  if (!name) return 'L'
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

interface TranscriptLine {
  time: string
  speaker: string
  text: string
}

function parseTranscript(raw: string): TranscriptLine[] {
  const lines: TranscriptLine[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Tactiq format: [00:01:23] Speaker: texto
    const tactiqMatch = trimmed.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.+?):\s*(.+)/)
    if (tactiqMatch) {
      lines.push({ time: tactiqMatch[1], speaker: tactiqMatch[2].trim(), text: tactiqMatch[3].trim() })
      continue
    }

    // Simple format: Speaker: texto
    const simpleMatch = trimmed.match(/^([^:]+):\s*(.+)$/)
    if (simpleMatch) {
      lines.push({ time: '', speaker: simpleMatch[1].trim(), text: simpleMatch[2].trim() })
      continue
    }

    // Continuation line
    if (lines.length > 0) {
      lines[lines.length - 1].text += ' ' + trimmed
    } else {
      lines.push({ time: '', speaker: 'Desconhecido', text: trimmed })
    }
  }
  return lines
}

function fixAccents(text: string): string {
  return text
    .replace(/\bNao\b/g, 'Não')
    .replace(/\bnao\b/g, 'não')
    .replace(/\bImplicacao\b/g, 'Implicação')
    .replace(/\bimplicacao\b/g, 'implicação')
    .replace(/\bacao\b/g, 'ação')
    .replace(/\bAcao\b/g, 'Ação')
    .replace(/\bobjecao\b/g, 'objeção')
    .replace(/\bObjecao\b/g, 'Objeção')
    .replace(/\bobjecoes\b/g, 'objeções')
    .replace(/\bObjecoes\b/g, 'Objeções')
    .replace(/\binformacao\b/g, 'informação')
    .replace(/\bInformacao\b/g, 'Informação')
    .replace(/\bsituacao\b/g, 'situação')
    .replace(/\bSituacao\b/g, 'Situação')
    .replace(/\btransicao\b/g, 'transição')
    .replace(/\bTransicao\b/g, 'Transição')
}

export default function CallDetailPage() {
  const params = useParams()
  const router = useRouter()
  const callId = params.id as string

  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [savingResult, setSavingResult] = useState(false)

  // Vincular lead — dialog de busca
  const [linkDialog, setLinkDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LeadSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  // Toast simples (mesmo padrão já usado em outras páginas)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ type, message })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000)
  }
  useEffect(() => () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current) }, [])

  const fetchCall = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('calls')
      .select('*, lead:leads(id, name, instagram_username, profile_pic_url)')
      .eq('id', callId)
      .single() as { data: any }
    if (data) {
      setCall(data as Call)
      setNotes(data.notes || '')
    }
    setLoading(false)
  }, [callId])

  useEffect(() => { fetchCall() }, [fetchCall])

  async function handleSetResult(result: CallResult) {
    if (!call || savingResult) return
    setSavingResult(true)
    const supabase = createClient()
    await supabase.from('calls').update({ result }).eq('id', call.id)
    setCall(prev => prev ? { ...prev, result } : prev)
    setSavingResult(false)
  }

  async function saveNotes() {
    if (!call) return
    const supabase = createClient()
    await supabase.from('calls').update({ notes }).eq('id', call.id)
  }

  function openLinkDialog() {
    setSelectedLeadId(call?.lead?.id || null)
    setSearchQuery('')
    setSearchResults([])
    setLinkDialog(true)
  }
  function closeLinkDialog() {
    setLinkDialog(false)
    setSearchQuery('')
    setSearchResults([])
    setSelectedLeadId(null)
  }

  // Debounce de 300ms na busca de leads — dispara apenas quando o dialog está aberto.
  // setState só dentro do callback async (dentro do setTimeout) pra não violar react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!linkDialog) return
    // Sanitiza metacaracteres do PostgREST (.or usa vírgula/parênteses como separadores)
    const sanitized = searchQuery.trim().replace(/[,()]/g, '').trim()
    if (!sanitized) return
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('leads')
          .select('id, name, instagram_username, profile_pic_url')
          .or(`name.ilike.%${sanitized}%,instagram_username.ilike.%${sanitized}%`)
          .limit(5)
        if (!error && data) setSearchResults(data as LeadSearchResult[])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, linkDialog])

  async function handleLinkLead() {
    if (!call || !selectedLeadId || linking) return
    setLinking(true)
    const supabase = createClient()
    const { error } = await supabase.from('calls').update({ lead_id: selectedLeadId }).eq('id', call.id)
    setLinking(false)
    if (error) {
      const e = error as unknown as { message?: string; details?: string; hint?: string; code?: string }
      console.error('Erro ao vincular lead:', { message: e.message, code: e.code, details: e.details, hint: e.hint })
      showToast('error', 'Erro ao vincular: ' + (e.message || e.details || 'tente novamente'))
      return
    }
    closeLinkDialog()
    await fetchCall() // recarrega a call com o lead vinculado
    showToast('success', 'Lead vinculado com sucesso')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="skeleton-shimmer h-10 w-48" />
        <div className="flex gap-6">
          <Skeleton className="skeleton-shimmer h-[500px] flex-1 rounded-[20px]" />
          <Skeleton className="skeleton-shimmer h-[500px] w-[340px] rounded-[16px]" />
        </div>
      </div>
    )
  }

  if (!call) {
    return (
      <div className="text-center py-20">
        <p className="text-[15px] text-[#9CA3AF]">Call não encontrada</p>
        <button onClick={() => router.push('/calls')} className="mt-3 text-[13px] text-[#3B82F6] hover:underline">
          Voltar para calls
        </button>
      </div>
    )
  }

  const RESULT_BADGE_STYLES: Record<string, { bg: string; text: string; ring: string; dot: string; label: string }> = {
    fechou: { bg: 'bg-[#10B981]/10', text: 'text-[#059669]', ring: 'ring-[#10B981]/20', dot: 'bg-[#10B981]', label: 'Fechou' },
    nao_fechou: { bg: 'bg-[#EF4444]/10', text: 'text-[#DC2626]', ring: 'ring-[#EF4444]/20', dot: 'bg-[#EF4444]', label: 'Não fechou' },
    reagendar: { bg: 'bg-[#F59E0B]/10', text: 'text-[#D97706]', ring: 'ring-[#F59E0B]/20', dot: 'bg-[#F59E0B]', label: 'Reagendar' },
    no_show: { bg: 'bg-[#6B7280]/10', text: 'text-[#4B5563]', ring: 'ring-[#6B7280]/20', dot: 'bg-[#6B7280]', label: 'No-show' },
  }

  const resultBadge = call.result && RESULT_BADGE_STYLES[call.result] ? (() => {
    const s = RESULT_BADGE_STYLES[call.result!]
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-full ring-1', s.bg, s.text, s.ring)}>
        <div className={cn('w-[6px] h-[6px] rounded-full', s.dot)} />
        {s.label}
      </span>
    )
  })() : null

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={() => router.push('/calls')}
        className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280] hover:text-[#111827] mb-5 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
        Voltar para calls
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column — Transcript */}
        <div className="flex-1 bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-4 flex-wrap">
              <LeadAvatar name={call.lead?.name || null} username={call.lead?.instagram_username} photoUrl={call.lead?.profile_pic_url || null} size="xl" className={cn('ring-[3px]', call.lead ? 'ring-[#C8E645]/20' : 'ring-[#F3F4F6]')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={cn(
                    'text-[20px] font-bold',
                    call.lead ? 'text-[#111827]' : 'text-[#9CA3AF] italic',
                  )}>
                    {call.lead ? getLeadDisplayName(call.lead) : 'Lead não identificado'}
                  </h2>
                  {call.lead?.id ? (
                    <>
                      <Link
                        href={`/leads/${call.lead.id}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1B3A2D] bg-[#C8E645]/15 px-2.5 py-1 rounded-full hover:bg-[#C8E645]/25 transition-all ml-1"
                      >
                        Ver ficha
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={openLinkDialog}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#111827] bg-transparent hover:bg-[#F3F4F6] px-2.5 py-1 rounded-full transition-colors"
                        title="Trocar o lead vinculado a esta call"
                      >
                        <Pencil className="w-3 h-3" />
                        Alterar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={openLinkDialog}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#111827] bg-[#C8E645] px-3 py-1.5 rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-95 transition-all ml-1"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Vincular Lead
                    </button>
                  )}
                </div>
                <p className="text-[13px] text-[#9CA3AF] mt-0.5">
                  {call.scheduled_at
                    ? format(new Date(call.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : 'Sem data'}
                  {call.duration_minutes ? ` · ${call.duration_minutes} min` : ''}
                </p>
              </div>

              {/* Result badge or action buttons */}
              {call.result ? (
                resultBadge
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleSetResult('fechou')}
                    disabled={savingResult}
                    className="px-4 py-2 border-[1.5px] border-[#10B981]/30 text-[#059669] text-[12px] font-bold rounded-full hover:bg-[#10B981] hover:text-white hover:border-[#10B981] active:scale-95 transition-all disabled:opacity-50"
                  >
                    Fechou
                  </button>
                  <button
                    onClick={() => handleSetResult('nao_fechou')}
                    disabled={savingResult}
                    className="px-4 py-2 border-[1.5px] border-[#EF4444]/30 text-[#DC2626] text-[12px] font-bold rounded-full hover:bg-[#EF4444] hover:text-white hover:border-[#EF4444] active:scale-95 transition-all disabled:opacity-50"
                  >
                    Não fechou
                  </button>
                  <button
                    onClick={() => handleSetResult('reagendar')}
                    disabled={savingResult}
                    className="px-4 py-2 border-[1.5px] border-[#E5E7EB] text-[#6B7280] text-[12px] font-semibold rounded-full hover:bg-[#F59E0B] hover:text-white hover:border-[#F59E0B] active:scale-95 transition-all disabled:opacity-50"
                  >
                    Reagendar
                  </button>
                  <button
                    onClick={() => handleSetResult('no_show')}
                    disabled={savingResult}
                    className="px-4 py-2 border-[1.5px] border-[#E5E7EB] text-[#6B7280] text-[12px] font-semibold rounded-full hover:bg-[#6B7280] hover:text-white hover:border-[#6B7280] active:scale-95 transition-all disabled:opacity-50"
                  >
                    No-show
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Transcript */}
          <div className="px-6 py-5">
            <h3 className="text-[14px] font-bold text-[#111827] mb-4">Transcrição</h3>

            {call.transcript ? (
              <div className="space-y-1">
                {parseTranscript(call.transcript).map((line, i) => {
                  const isLukhas = line.speaker.toLowerCase().includes('lukhas')
                  return (
                    <div key={i} className="flex gap-3 py-2 hover:bg-[#FAFBFC] px-2 -mx-2 rounded-lg transition-colors">
                      {line.time && (
                        <span className="text-[11px] text-[#C0C7D0] font-mono w-[60px] flex-shrink-0 pt-0.5">
                          {line.time}
                        </span>
                      )}
                      <span className={cn(
                        'text-[12px] font-bold w-[70px] flex-shrink-0 pt-0.5',
                        isLukhas ? 'text-[#1B3A2D]' : 'text-[#6B7280]'
                      )}>
                        {line.speaker}:
                      </span>
                      <p className="text-[13px] text-[#374151] leading-relaxed flex-1">{line.text}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-7 h-7 text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-[13px] text-[#9CA3AF]">Transcrição não disponível</p>
                <p className="text-[11px] text-[#C0C7D0] mt-1">Será adicionada automaticamente após a call</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column — AI Analysis */}
        <div className="w-full lg:w-[340px] flex-shrink-0 space-y-4">
          {call.ai_analysis ? (
            <>
              {/* Score */}
              <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-5 text-center">
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-2">Score da call</p>
                <div className={cn(
                  'text-[48px] font-extrabold tracking-tight',
                  call.ai_analysis.score >= 7 ? 'text-[#10B981]'
                    : call.ai_analysis.score >= 5 ? 'text-[#F59E0B]'
                    : 'text-[#EF4444]'
                )}>
                  {call.ai_analysis.score}
                </div>
                <p className="text-[12px] text-[#9CA3AF]">de 10</p>
                <div className="w-full h-[6px] bg-[#F3F4F6] rounded-full mt-3 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      call.ai_analysis.score >= 7 ? 'bg-[#10B981]'
                        : call.ai_analysis.score >= 5 ? 'bg-[#F59E0B]'
                        : 'bg-[#EF4444]'
                    )}
                    style={{ width: `${call.ai_analysis.score * 10}%` }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-5">
                <h4 className="text-[13px] font-bold text-[#111827] mb-2">Resumo</h4>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{fixAccents(call.ai_analysis.summary)}</p>
              </div>

              {/* Strengths */}
              {call.ai_analysis.strengths.length > 0 && (
                <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-5">
                  <h4 className="text-[13px] font-bold text-[#10B981] mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" /> Pontos fortes
                  </h4>
                  <ul className="space-y-2">
                    {call.ai_analysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 flex-shrink-0" />
                        {fixAccents(s)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {call.ai_analysis.improvements.length > 0 && (
                <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-5">
                  <h4 className="text-[13px] font-bold text-[#F59E0B] mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Melhorias
                  </h4>
                  <ul className="space-y-2">
                    {call.ai_analysis.improvements.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1.5 flex-shrink-0" />
                        {fixAccents(s)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Objections */}
              {call.ai_analysis.objections.length > 0 && (
                <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-5">
                  <h4 className="text-[13px] font-bold text-[#EF4444] mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Objeções não tratadas
                  </h4>
                  <ul className="space-y-2">
                    {call.ai_analysis.objections.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1.5 flex-shrink-0" />
                        {fixAccents(s)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lost moment */}
              {call.ai_analysis.lost_moment && (
                <div className="bg-white rounded-[16px] border border-[#EF4444]/15 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-5">
                  <h4 className="text-[13px] font-bold text-[#DC2626] mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Momento que perdeu a venda
                  </h4>
                  <p className="text-[13px] text-[#374151] leading-relaxed">{fixAccents(call.ai_analysis.lost_moment)}</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-[#F7F8F9] flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-[#C0C7D0]" />
              </div>
              <p className="text-[13px] font-medium text-[#6B7280]">Análise da IA pendente</p>
              <p className="text-[11px] text-[#C0C7D0] mt-1">Será gerada após a transcrição da call</p>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-5">
            <h4 className="text-[13px] font-bold text-[#111827] mb-3">Notas</h4>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Adicionar observações sobre essa call..."
              className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[13px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all resize-none min-h-[100px]"
            />
          </div>
        </div>
      </div>

      {/* Dialog: Vincular / alterar lead */}
      <Dialog open={linkDialog} onOpenChange={open => { if (!open) closeLinkDialog() }}>
        <DialogContent className={cn('[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[480px] max-h-[calc(100vh-48px)] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.15)]')}>
          <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
            <div>
              <h3 className="text-[18px] font-bold text-[#111827]">
                {call.lead ? 'Alterar lead vinculado' : 'Vincular Lead'}
              </h3>
              <p className="text-[13px] text-[#6B7280] mt-1">
                Busque por nome ou @username
              </p>
            </div>
            <button onClick={closeLinkDialog} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>

          <div className="px-6 pb-2 flex-shrink-0">
            <div className="flex items-center bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] focus-within:border-[#C8E645] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] rounded-full px-4 py-2.5 transition-all">
              <Search className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou @username"
                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[14px] text-[#374151] placeholder-[#C0C7D0] ml-2 py-0 min-w-0"
              />
              {searching && <Loader2 className="w-4 h-4 text-[#C0C7D0] animate-spin flex-shrink-0" />}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 dropdown-scroll px-3 py-2">
            {searchQuery.trim() === '' ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full bg-[#F7F8F9] flex items-center justify-center mx-auto mb-2">
                  <Search className="w-5 h-5 text-[#C0C7D0]" />
                </div>
                <p className="text-[13px] text-[#9CA3AF]">Digite para buscar leads</p>
              </div>
            ) : !searching && searchResults.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[13px] text-[#9CA3AF]">Nenhum lead encontrado</p>
                <p className="text-[11px] text-[#C0C7D0] mt-1">Tente outro termo</p>
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map(lead => {
                  const selected = selectedLeadId === lead.id
                  const display = getLeadDisplayName(lead)
                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-left transition-all',
                        selected
                          ? 'bg-[#C8E645]/10 ring-1 ring-[#C8E645]/30'
                          : 'hover:bg-[#F7F8F9]',
                      )}
                    >
                      <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-[13px] font-semibold truncate', selected ? 'text-[#111827]' : 'text-[#111827]')}>
                          {display}
                        </p>
                        {lead.instagram_username && (
                          <p className="text-[11px] text-[#9CA3AF] truncate">@{lead.instagram_username}</p>
                        )}
                      </div>
                      {selected && (
                        <div className="w-5 h-5 rounded-full bg-[#C8E645] flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#111827]" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3 flex-shrink-0">
            <button
              onClick={closeLinkDialog}
              disabled={linking}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleLinkLead}
              disabled={!selectedLeadId || selectedLeadId === call.lead?.id || linking}
              className={cn(
                'flex-1 py-3 rounded-full text-[14px] font-bold transition-all flex items-center justify-center gap-2',
                selectedLeadId && selectedLeadId !== call.lead?.id && !linking
                  ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]'
                  : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed',
              )}
            >
              {linking ? <><Loader2 className="w-4 h-4 animate-spin" /> Vinculando...</> : 'Vincular'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-6 right-6 flex items-start gap-2 text-white text-[13px] font-medium px-4 py-3 rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] animate-dropdown-in z-50 max-w-[380px]',
            toast.type === 'error' ? 'bg-[#EF4444]' : 'bg-[#111827]',
          )}
        >
          {toast.type === 'error'
            ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <Check className="w-4 h-4 text-[#C8E645] flex-shrink-0 mt-0.5" />
          }
          <span className="flex-1 leading-relaxed">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
