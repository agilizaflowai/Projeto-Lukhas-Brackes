'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Board } from '@/components/kanban/Board'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { NewLeadModal } from '@/components/dashboard/NewLeadModal'
import { FilterDropdown, MultiFilterDropdown } from '@/components/common/FilterDropdown'
import { InlineDatePicker } from '@/components/common/InlineDatePicker'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Plus, X, AlertCircle, Info, RefreshCw, Globe, User, Tag, Bot, Clock, ChevronDown, Check } from 'lucide-react'
import type { Lead, LeadStage } from '@/lib/types'

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [showNewLead, setShowNewLead] = useState(false)

  // Drag state for cancel support
  const [pendingDrag, setPendingDrag] = useState<{ leadId: string; originalStage: LeadStage } | null>(null)

  // Dialog states
  const [callDialog, setCallDialog] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null })
  const [callDate, setCallDate] = useState<Date | null>(null)
  const [callTime, setCallTime] = useState('')
  const [showCustomTime, setShowCustomTime] = useState(false)
  const [callObjective, setCallObjective] = useState('metodologia')
  const [objectiveOpen, setObjectiveOpen] = useState(false)
  const [followUpDialog, setFollowUpDialog] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null })

  const OBJECTIVE_OPTIONS = [
    { value: 'metodologia', label: 'Apresentação de Metodologia', desc: 'Mostrar como funciona a consultoria', color: '#3B82F6' },
    { value: 'plano', label: 'Plano de Ação', desc: 'Apresentar plano personalizado', color: '#8B5CF6' },
    { value: 'fechamento', label: 'Fechamento', desc: 'Proposta e contrato', color: '#10B981' },
    { value: 'outro', label: 'Outro', desc: 'Objetivo personalizado', color: '#6B7280' },
  ] as const

  const supabase = createClient()

  const loadLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('is_active', true)
      .neq('stage', 'lead_frio')
      .order('stage_changed_at', { ascending: false, nullsFirst: false })

    if (data) setLeads(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLeads()
    const channel = supabase
      .channel('pipeline-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadLeads())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadLeads])

  function cancelDrag() {
    if (pendingDrag) {
      setLeads(prev => prev.map(l =>
        l.id === pendingDrag.leadId ? { ...l, stage: pendingDrag.originalStage } : l
      ))
      setPendingDrag(null)
    }
    setCallDialog({ open: false, leadId: null })
    setCallDate(null)
    setCallTime('')
    setShowCustomTime(false)
    setCallObjective('metodologia')
    setObjectiveOpen(false)
    setFollowUpDialog({ open: false, leadId: null })
  }

  async function handleStageChange(leadId: string, newStage: LeadStage) {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    if (newStage === 'call_agendada') {
      setPendingDrag({ leadId, originalStage: lead.stage })
      setCallDialog({ open: true, leadId })
      return
    }

    if (newStage === 'perdido') {
      setPendingDrag({ leadId, originalStage: lead.stage })
      setFollowUpDialog({ open: true, leadId })
      return
    }

    await updateLeadStage(leadId, newStage)
  }

  async function updateLeadStage(leadId: string, newStage: LeadStage) {
    const now = new Date().toISOString()
    setLeads(prev => {
      const updated = prev.map(l =>
        l.id === leadId ? { ...l, stage: newStage, stage_changed_at: now } : l
      )
      // Move the updated lead to the front so it appears first in its new column
      const lead = updated.find(l => l.id === leadId)
      if (!lead) return updated
      return [lead, ...updated.filter(l => l.id !== leadId)]
    })
    setPendingDrag(null)

    await supabase.from('leads').update({
      stage: newStage,
      stage_changed_at: new Date().toISOString(),
    }).eq('id', leadId)

    const leadForLog = leads.find(l => l.id === leadId)
    await supabase.from('activity_log').insert({
      lead_id: leadId,
      action: 'stage_changed',
      details: { new_stage: newStage, lead_name: leadForLog?.name || leadForLog?.instagram_username || 'Lead' },
      created_by: 'user',
    })
  }

  async function handleScheduleCall() {
    if (!callDialog.leadId || !callDate || !callTime) return
    const [hours, minutes] = callTime.split(':').map(Number)
    const scheduledAt = new Date(callDate)
    scheduledAt.setHours(hours, minutes, 0, 0)
    const objectiveLabel = OBJECTIVE_OPTIONS.find(o => o.value === callObjective)?.label || callObjective
    await updateLeadStage(callDialog.leadId, 'call_agendada')
    await supabase.from('calls').insert({
      lead_id: callDialog.leadId,
      scheduled_at: scheduledAt.toISOString(),
      notes: objectiveLabel,
    })
    setCallDialog({ open: false, leadId: null })
    setCallDate(null)
    setCallTime('')
    setShowCustomTime(false)
    setCallObjective('metodologia')
    setObjectiveOpen(false)
  }

  async function handleFollowUp(sendToFollowUp: boolean) {
    if (!followUpDialog.leadId) return
    if (sendToFollowUp) {
      const nextFollowUp = new Date()
      nextFollowUp.setDate(nextFollowUp.getDate() + 3)
      await supabase.from('leads').update({
        stage: 'follow_up',
        stage_changed_at: new Date().toISOString(),
        next_follow_up_at: nextFollowUp.toISOString(),
      }).eq('id', followUpDialog.leadId)
      setLeads(prev => prev.map(l =>
        l.id === followUpDialog.leadId
          ? { ...l, stage: 'follow_up' as LeadStage, stage_changed_at: new Date().toISOString(), next_follow_up_at: nextFollowUp.toISOString() }
          : l
      ))
      setPendingDrag(null)
      const fuLead = leads.find(l => l.id === followUpDialog.leadId)
      await supabase.from('activity_log').insert({
        lead_id: followUpDialog.leadId,
        action: 'stage_changed',
        details: { new_stage: 'follow_up', lead_name: fuLead?.name || fuLead?.instagram_username || 'Lead' },
        created_by: 'user',
      })
    } else {
      await updateLeadStage(followUpDialog.leadId, 'perdido')
    }
    setFollowUpDialog({ open: false, leadId: null })
  }

  // Filters
  const filtered = leads.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      if (!l.name?.toLowerCase().includes(q) && !l.instagram_username.toLowerCase().includes(q)) return false
    }
    if (filterSource && l.source !== filterSource) return false
    if (filterAssigned && l.assigned_to !== filterAssigned) return false
    if (filterTags.length > 0 && !filterTags.some(ft => l.tags.some(t => t.toLowerCase() === ft.toLowerCase()))) return false
    return true
  })

  // Dynamic tags from loaded leads
  const allTagOptions = useMemo(() => {
    const tagCounts = new Map<string, number>()
    leads.forEach(lead => {
      lead.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    const TAG_COLORS: Record<string, string> = {
      emagrecer: '#10B981', emagrecimento: '#10B981',
      hipertrofia: '#3B82F6', massa: '#3B82F6',
      saude: '#F59E0B', 'saúde': '#F59E0B',
      performance: '#8B5CF6', atleta: '#8B5CF6',
    }
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({
        value: tag,
        label: tag.charAt(0).toUpperCase() + tag.slice(1),
        icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TAG_COLORS[tag.toLowerCase()] || '#6B7280' }} />,
        count,
      }))
  }, [leads])

  const hasFilters = !!(filterSource || filterAssigned || filterTags.length > 0)
  const callLead = callDialog.leadId ? leads.find(l => l.id === callDialog.leadId) : null

  /* ═══ Loading ═══ */
  if (loading) {
    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <div className="h-9 w-64 skeleton-shimmer rounded-lg" />
            <div className="h-5 w-80 skeleton-shimmer rounded-lg mt-2" />
          </div>
        </div>
        <div className="flex gap-[14px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[272px] flex-shrink-0 h-[400px] rounded-[16px] skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  /* ═══ Render ═══ */
  return (
    <div>
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">
            Pipeline de Vendas
          </h2>
          <p className="text-[#414844] opacity-80 font-normal mt-1">
            <span className="font-semibold text-[#111827]">{filtered.length}</span> leads no funil · Arraste entre as etapas
          </p>
        </div>
        <button
          onClick={() => setShowNewLead(true)}
          className="flex items-center gap-2 bg-[#1B3A2D] text-white px-5 py-2.5 rounded-full text-[14px] font-bold hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </button>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center bg-[#F7F8F9] border border-[#EFEFEF] px-4 py-2 rounded-full w-[220px] focus-within:border-[#C8E645] transition-colors">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-[14px] text-[#374151] w-full ml-2 placeholder-[#9CA3AF] py-0"
            placeholder="Filtrar leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <FilterDropdown
          label="Todas Origens"
          icon={<Globe className="w-4 h-4" />}
          options={[
            { value: 'dm_direta', label: 'DM Direta', icon: <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />, count: leads.filter(l => l.source === 'dm_direta').length },
            { value: 'story_reply', label: 'Story Reply', icon: <div className="w-2 h-2 rounded-full bg-[#3ECFB2]" />, count: leads.filter(l => l.source === 'story_reply').length },
            { value: 'comentario', label: 'Comentário', icon: <div className="w-2 h-2 rounded-full bg-[#C8E645]" />, count: leads.filter(l => l.source === 'comentario').length },
            { value: 'curtida', label: 'Curtida', icon: <div className="w-2 h-2 rounded-full bg-[#EC4899]" />, count: leads.filter(l => l.source === 'curtida').length },
            { value: 'seguidor', label: 'Novo Seguidor', icon: <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />, count: leads.filter(l => l.source === 'seguidor').length },
            { value: 'manual', label: 'Manual', icon: <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />, count: leads.filter(l => l.source === 'manual').length },
          ]}
          value={filterSource}
          onChange={v => setFilterSource(v)}
        />

        <FilterDropdown
          label="Responsável"
          icon={<User className="w-4 h-4" />}
          options={[
            {
              value: 'ia',
              label: 'IA Assistant',
              icon: <div className="w-5 h-5 rounded-md bg-[#C8E645]/20 flex items-center justify-center"><Bot className="w-3 h-3 text-[#7A9E00]" /></div>,
              count: leads.filter(l => l.assigned_to === 'ia').length,
            },
            {
              value: 'lukhas',
              label: 'Lukhas',
              icon: <div className="w-5 h-5 rounded-full bg-[#1B3A2D] flex items-center justify-center"><span className="text-[8px] text-white font-bold">L</span></div>,
              count: leads.filter(l => l.assigned_to === 'lukhas').length,
            },
            {
              value: 'assistente',
              label: 'Assistente',
              icon: <div className="w-5 h-5 rounded-full bg-[#3B82F6]/15 flex items-center justify-center"><span className="text-[8px] text-[#3B82F6] font-bold">A</span></div>,
              count: leads.filter(l => l.assigned_to === 'assistente').length,
            },
          ]}
          value={filterAssigned}
          onChange={v => setFilterAssigned(v)}
        />

        <MultiFilterDropdown
          label="Tags"
          icon={<Tag className="w-4 h-4" />}
          options={allTagOptions}
          value={filterTags}
          onChange={v => setFilterTags(v)}
        />
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filterSource && (
            <span className="flex items-center gap-1 bg-[#C8E645]/15 text-[#5A6B00] text-[12px] font-semibold px-3 py-1 rounded-full">
              {({ dm_direta: 'DM Direta', story_reply: 'Story Reply', comentario: 'Comentário', curtida: 'Curtida', seguidor: 'Seguidor', manual: 'Manual' })[filterSource] || filterSource}
              <button onClick={() => setFilterSource('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterAssigned && (
            <span className="flex items-center gap-1 bg-[#C8E645]/15 text-[#5A6B00] text-[12px] font-semibold px-3 py-1 rounded-full">
              {filterAssigned}
              <button onClick={() => setFilterAssigned('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterTags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-[#C8E645]/15 text-[#5A6B00] text-[12px] font-semibold px-3 py-1 rounded-full">
              {tag}
              <button onClick={() => setFilterTags(prev => prev.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Board */}
      <Board
        leads={filtered}
        onStageChange={handleStageChange}
        onScheduleCall={(leadId) => setCallDialog({ open: true, leadId })}
      />

      {/* Dialog: Schedule Call */}
      <Dialog open={callDialog.open} onOpenChange={open => { if (!open) cancelDrag() }}>
        <DialogContent className={cn(
          '[&>button]:hidden',
          'bg-white rounded-[20px] p-0 overflow-hidden',
          'w-[calc(100vw-32px)] max-w-[440px]',
          'max-h-[calc(100vh-48px)] flex flex-col',
          'shadow-[0_20px_60px_rgba(0,0,0,0.15)]',
        )}>
          {/* Header — fixo no topo */}
          <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
            <h3 className="text-[18px] font-bold text-[#111827]">Agendar Call</h3>
            <button onClick={cancelDrag} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 min-h-0 dropdown-scroll">
            {/* Lead info */}
            {callLead && (
              <div className="mx-6 mb-4 flex items-center gap-3 p-3 bg-[#F7F8F9] rounded-[12px]">
                <div className="w-10 h-10 rounded-full bg-[#C8E645]/20 flex items-center justify-center text-[13px] font-bold text-[#7A9E00]">
                  {(callLead.name || callLead.instagram_username)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#111827] truncate">{callLead.name || callLead.instagram_username}</p>
                  <p className="text-[12px] text-[#9CA3AF]">@{callLead.instagram_username}</p>
                </div>
              </div>
            )}

            {/* Inline calendar */}
            <div className="px-6 mb-4">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2 block">
                Data
              </label>
              <div className="bg-[#F7F8F9] rounded-[12px] p-3 border border-[#EFEFEF]">
                <InlineDatePicker selected={callDate} onSelect={setCallDate} />
              </div>
              {callDate && (
                <p className="text-[12px] text-[#6B7280] mt-1.5 pl-1">
                  {format(callDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              )}
            </div>

            {/* Time grid */}
            <div className="px-6 mb-4">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2 block">
                Horário
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => { setCallTime(time); setShowCustomTime(false) }}
                    className={cn(
                      'py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-150',
                      callTime === time && !showCustomTime
                        ? 'bg-[#C8E645] text-[#111827] font-bold shadow-[0_2px_8px_rgba(200,230,69,0.3)]'
                        : 'bg-[#F7F8F9] text-[#374151] border border-[#EFEFEF] hover:border-[#C8E645]/40',
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowCustomTime(!showCustomTime)}
                className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#111827] transition-colors group"
              >
                <Clock className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#7A9E00] transition-colors" />
                {showCustomTime ? 'Fechar' : 'Outro horário'}
              </button>
              {showCustomTime && (
                <div className="mt-2 animate-dropdown-in">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:MM"
                      maxLength={5}
                      value={callTime}
                      onChange={e => {
                        let v = e.target.value.replace(/[^\d:]/g, '')
                        const digits = v.replace(/:/g, '')
                        if (digits.length >= 3) {
                          v = digits.slice(0, 2) + ':' + digits.slice(2, 4)
                        }
                        if (v.length > 5) v = v.slice(0, 5)
                        if (v.match(/^\d{2}:\d{2}$/)) {
                          const [h, m] = v.split(':').map(Number)
                          if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                            setCallTime(v)
                            return
                          }
                        }
                        setCallTime(v)
                      }}
                      className={cn(
                        'w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[12px]',
                        'px-4 py-3 pl-11 text-[14px] text-[#374151] font-mono tracking-wider',
                        'focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white',
                        'focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)]',
                        'transition-all duration-200',
                      )}
                    />
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Objective dropdown */}
            <div className="px-6 mb-4">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2 block">
                Objetivo da call
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setObjectiveOpen(!objectiveOpen)}
                  className={cn(
                    'w-full flex items-center justify-between',
                    'bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[12px]',
                    'px-4 py-3 text-[14px] text-left text-[#111827]',
                    'focus:outline-none transition-all duration-200',
                    objectiveOpen
                      ? 'border-[#C8E645] bg-white shadow-[0_0_0_3px_rgba(200,230,69,0.15)]'
                      : 'hover:border-[#C8E645]/40',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: OBJECTIVE_OPTIONS.find(o => o.value === callObjective)?.color }}
                    />
                    <span>{OBJECTIVE_OPTIONS.find(o => o.value === callObjective)?.label}</span>
                  </div>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-[#9CA3AF] transition-transform duration-200',
                    objectiveOpen && 'rotate-180',
                  )} />
                </button>

                {objectiveOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setObjectiveOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-[14px] border border-[#EFEFEF] shadow-[0_4px_24px_rgba(0,0,0,0.10)] py-1.5 animate-dropdown-in">
                      {OBJECTIVE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setCallObjective(opt.value); setObjectiveOpen(false) }}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 transition-colors text-left',
                            callObjective === opt.value ? 'bg-[#C8E645]/8' : 'hover:bg-[#F7F8F9]',
                          )}
                        >
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {callObjective === opt.value ? (
                              <Check className="w-4 h-4 text-[#C8E645]" />
                            ) : (
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-[13px]',
                              callObjective === opt.value ? 'font-bold text-[#111827]' : 'font-medium text-[#374151]',
                            )}>
                              {opt.label}
                            </p>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className="mx-6 mb-4 flex items-start gap-2.5 p-3 bg-[#C8E645]/8 rounded-[10px]">
              <Info className="w-4 h-4 text-[#7A9E00] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#5A6B00] leading-relaxed">
                Lembrete enviado via WhatsApp 1h antes.
              </p>
            </div>
          </div>

          {/* Footer — fixo no fundo */}
          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3 flex-shrink-0">
            <button
              onClick={cancelDrag}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleScheduleCall}
              disabled={!callDate || !callTime}
              className={cn(
                'flex-1 py-3 rounded-full text-[14px] font-bold transition-all',
                callDate && callTime
                  ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]'
                  : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed',
              )}
            >
              Agendar Call
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Follow-up */}
      <Dialog open={followUpDialog.open} onOpenChange={open => { if (!open) cancelDrag() }}>
        <DialogContent onClose={cancelDrag} className="w-[440px]">
          <div className="text-center">
            <div className="w-[72px] h-[72px] rounded-full bg-[#FEF3C7] flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
            </div>
            <h3 className="text-[20px] font-bold text-[#111827] mb-2">Lead não fechou</h3>
            <p className="text-[14px] text-[#6B7280] mb-1">
              Deseja enviar para o follow-up automático?
            </p>
            <p className="text-[12px] text-[#9CA3AF] mb-8">
              O sistema enviará mensagens personalizadas a cada 3 dias
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleFollowUp(true)}
              className="w-full px-5 py-3 bg-[#C8E645] text-[#111827] rounded-full text-[14px] font-bold shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:bg-[#AECF1E] transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sim, enviar pra Follow-up
            </button>
            <button
              onClick={() => handleFollowUp(false)}
              className="w-full px-5 py-3 border-[1.5px] border-[#EF4444]/30 text-[#EF4444] rounded-full text-[14px] font-semibold hover:bg-[#FEF2F2] hover:border-[#EF4444]/50 transition-all"
            >
              Não, marcar como Perdido
            </button>
            <button
              onClick={cancelDrag}
              className="w-full px-5 py-2 text-[13px] text-[#9CA3AF] hover:text-[#374151] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Lead Modal */}
      <NewLeadModal
        open={showNewLead}
        onOpenChange={setShowNewLead}
        onCreated={loadLeads}
      />
    </div>
  )
}
