'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, getLeadDisplayName, getLeadDisplayUsername, isValidInstagramUsername, previewFollowUpTemplate } from '@/lib/utils'
import { DropdownPortal } from '@/components/common/DropdownPortal'
import {
  RefreshCw, Pause, XCircle, Plus, Pencil, Trash2, X, Eye,
  Bot, User, Settings, Check, ChevronDown, Clock, MessageSquare, ExternalLink,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Lead, FollowUpRule, FollowUpHistory } from '@/lib/types'

function getInitials(name?: string | null): string {
  if (!name) return 'L'
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

const CONDITION_LABELS: Record<string, string> = {
  sem_resposta: 'Sem resposta',
  nao_fechou_call: 'Não fechou na call',
  lead_frio_seguidor: 'Lead frio (seguidor)',
  lead_frio_curtida: 'Lead frio (curtida)',
  inativo_7d: 'Inativo há 7 dias',
  inativo_14d: 'Inativo há 14 dias',
  inativo_30d: 'Inativo há 30 dias',
}

const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))

function getConditionLabel(c: string): string {
  return CONDITION_LABELS[c] || c
}

type TabValue = 'leads' | 'rules' | 'history'

const EMPTY_RULE = { trigger_condition: '', days_after: 3, message_template: '', use_testimonial: false, priority: 0 }

export default function FollowUpPage() {
  const router = useRouter()
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [rules, setRules] = useState<FollowUpRule[]>([])
  const [history, setHistory] = useState<(FollowUpHistory & { lead?: Lead; rule?: FollowUpRule })[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabValue>('leads')

  // Rule modal
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<FollowUpRule | null>(null)
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE)
  const [savingRule, setSavingRule] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [tempTemplate, setTempTemplate] = useState('')

  // Condition dropdown
  const [conditionOpen, setConditionOpen] = useState(false)
  const conditionTriggerRef = useRef<HTMLButtonElement>(null)

  async function loadLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('stage', 'follow_up')
      .eq('is_active', true)
      .order('next_follow_up_at', { ascending: true, nullsFirst: false })
    if (data) setLeads(data)
  }

  async function loadRules() {
    const { data } = await supabase
      .from('follow_up_rules')
      .select('*')
      .order('priority', { ascending: true })
    if (data) setRules(data)
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('follow_up_history')
      .select('*, lead:leads(id, name, instagram_username, profile_pic_url), rule:follow_up_rules(trigger_condition)')
      .order('sent_at', { ascending: false })
      .limit(50) as { data: any }
    if (data) setHistory(data)
  }

  useEffect(() => {
    Promise.all([loadLeads(), loadRules(), loadHistory()]).then(() => setLoading(false))
  }, [])

  async function pauseFollowUp(leadId: string) {
    await supabase.from('leads').update({
      stage: 'rapport',
      stage_changed_at: new Date().toISOString(),
    }).eq('id', leadId)
    setLeads(prev => prev.filter(l => l.id !== leadId))
  }

  async function moveToLost(leadId: string) {
    await supabase.from('leads').update({
      stage: 'perdido',
      stage_changed_at: new Date().toISOString(),
    }).eq('id', leadId)
    setLeads(prev => prev.filter(l => l.id !== leadId))
  }

  async function toggleRule(id: string, isActive: boolean) {
    await supabase.from('follow_up_rules').update({ is_active: isActive }).eq('id', id)
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive } : r))
  }

  function openCreateRule() {
    setEditingRule(null)
    setRuleForm(EMPTY_RULE)
    setRuleModalOpen(true)
  }

  function openEditRule(rule: FollowUpRule) {
    setEditingRule(rule)
    setRuleForm({
      trigger_condition: rule.trigger_condition,
      days_after: rule.days_after,
      message_template: rule.message_template,
      use_testimonial: rule.use_testimonial,
      priority: rule.priority,
    })
    setRuleModalOpen(true)
  }

  async function saveRule() {
    if (!ruleForm.trigger_condition || !ruleForm.days_after) return
    setSavingRule(true)
    const payload = {
      trigger_condition: ruleForm.trigger_condition,
      days_after: ruleForm.days_after,
      message_template: ruleForm.message_template,
      use_testimonial: ruleForm.use_testimonial,
      testimonial_match_fields: ruleForm.use_testimonial ? ['student_goal', 'student_gender'] : [],
      is_active: true,
      priority: ruleForm.priority,
    }
    if (editingRule) {
      await supabase.from('follow_up_rules').update(payload).eq('id', editingRule.id)
    } else {
      await supabase.from('follow_up_rules').insert(payload)
    }
    setSavingRule(false)
    setRuleModalOpen(false)
    loadRules()
  }

  async function deleteRule(id: string) {
    await supabase.from('follow_up_rules').delete().eq('id', id)
    setDeleteConfirm(null)
    loadRules()
  }

  // Stats
  const activeCount = leads.length
  const todayCount = history.filter(h => {
    const d = new Date(h.sent_at)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length

  const selectedCondition = CONDITION_OPTIONS.find(o => o.value === ruleForm.trigger_condition)
  const canSaveRule = !!(ruleForm.trigger_condition && ruleForm.days_after && ruleForm.message_template.trim())

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Follow-up</h2>
          <p className="text-[#414844] opacity-80 mt-1">
            Acompanhe e configure o reengajamento automático de leads
          </p>
        </div>

        {/* Mini stats */}
        <div className="flex items-center bg-white rounded-[14px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-r border-[#F3F4F6]">
            <div className="w-2 h-2 rounded-full bg-[#C8E645]" />
            <div>
              <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Em follow-up</p>
              <p className="text-[18px] font-bold text-[#111827] tabular-nums">{activeCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 border-r border-[#F3F4F6]">
            <div className="w-2 h-2 rounded-full bg-[#10B981]" />
            <div>
              <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Regras ativas</p>
              <p className="text-[18px] font-bold text-[#111827] tabular-nums">{rules.filter(r => r.is_active).length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <div>
              <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Envios hoje</p>
              <p className="text-[18px] font-bold text-[#111827] tabular-nums">{todayCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex p-1 bg-[#F3F4F6] rounded-full">
          {([
            { value: 'leads' as TabValue, label: 'Leads em follow-up', count: activeCount },
            { value: 'rules' as TabValue, label: 'Regras', count: rules.length },
            { value: 'history' as TabValue, label: 'Histórico' },
          ] as { value: TabValue; label: string; count?: number }[]).map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all',
                tab === t.value
                  ? 'bg-white text-[#111827] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#374151]'
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn(
                  'ml-1.5 text-[11px]',
                  t.count > 0
                    ? tab === t.value ? 'text-[#111827] font-semibold' : 'text-[#6B7280]'
                    : 'text-[#D1D5DB]'
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'rules' && (
          <button
            onClick={openCreateRule}
            className="flex items-center gap-2 bg-[#1B3A2D] text-white px-5 py-2.5 rounded-full text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Nova regra
          </button>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 skeleton-shimmer rounded-[16px]" />
          ))}
        </div>
      ) : (
        <>
          {/* ═══ TAB: LEADS ═══ */}
          {tab === 'leads' && (
            leads.length === 0 ? (
              <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#C8E645]/10 flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-7 h-7 text-[#C8E645]" />
                </div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-1">Nenhum lead em follow-up</h3>
                <p className="text-[13px] text-[#9CA3AF]">Leads aparecerão aqui quando entrarem no fluxo automático</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map(lead => {
                  const nextFollowUp = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null
                  const isOverdue = nextFollowUp ? nextFollowUp < new Date() : false
                  const daysSince = lead.last_interaction_at
                    ? Math.floor((Date.now() - new Date(lead.last_interaction_at).getTime()) / 86400000)
                    : null

                  return (
                    <div key={lead.id} className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.09)] transition-all duration-200 overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="lg" />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link href={`/leads/${lead.id}`} className="text-[15px] font-bold text-[#111827] hover:underline truncate">
                                {getLeadDisplayName(lead)}
                              </Link>
                              {getLeadDisplayUsername(lead) && (
                                <span className="text-[11px] text-[#C0C7D0]">{getLeadDisplayUsername(lead)}</span>
                              )}
                            </div>

                            {/* Metadata pills */}
                            <div className="flex items-center flex-wrap gap-2 mt-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                                <RefreshCw className="w-3 h-3" />
                                Tentativa {lead.follow_up_count || 0} de 6
                              </span>
                              {daysSince !== null && (
                                <span className={cn(
                                  'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full',
                                  daysSince > 7 ? 'bg-[#F59E0B]/10 text-[#D97706]' : 'bg-[#F3F4F6] text-[#6B7280]'
                                )}>
                                  <Clock className="w-3 h-3" />
                                  {daysSince}d sem resposta
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                                {lead.assigned_to === 'ia' ? (
                                  <><Bot className="w-3 h-3 text-[#7A9E00]" /> IA</>
                                ) : (
                                  <><User className="w-3 h-3" /> {lead.assigned_to}</>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Right side: next send + actions */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {/* Next send */}
                            {nextFollowUp ? (
                              <div className={cn(
                                'text-right px-3 py-1.5 rounded-[8px]',
                                isOverdue ? 'bg-[#F59E0B]/8' : 'bg-[#F3F4F6]'
                              )}>
                                <p className="text-[9px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Próximo envio</p>
                                <p className={cn(
                                  'text-[12px] font-bold mt-0.5',
                                  isOverdue ? 'text-[#D97706]' : 'text-[#111827]'
                                )}>
                                  {isOverdue
                                    ? `Atrasado ${formatDistanceToNow(nextFollowUp, { locale: ptBR, addSuffix: false })}`
                                    : format(nextFollowUp, "dd/MM 'às' HH:mm")
                                  }
                                </p>
                              </div>
                            ) : null}

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => { router.push(`/leads/${lead.id}?tab=conversa`) }}
                                className="px-3 py-1.5 bg-[#C8E645] text-[#1B3A2D] text-[11px] font-bold rounded-full uppercase tracking-[0.04em] shadow-[0_2px_8px_rgba(200,230,69,0.35)] hover:scale-105 active:scale-95 transition-transform"
                              >
                                Contatar
                              </button>
                              {isValidInstagramUsername(lead.instagram_username) && (
                                <a
                                  href={`https://instagram.com/${lead.instagram_username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] active:scale-95 transition-all"
                                  title="Abrir Instagram"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => pauseFollowUp(lead.id)}
                                className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:bg-[#F7F8F9] hover:text-[#6B7280] active:scale-95 transition-all"
                                title="Pausar follow-up"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => moveToLost(lead.id)}
                                className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:bg-[#FEF2F2] hover:border-[#EF4444]/30 hover:text-[#EF4444] active:scale-95 transition-all"
                                title="Marcar como perdido"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar footer */}
                      <div className="px-5 py-3 bg-[#FAFBFC] border-t border-[#F5F5F5]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-medium text-[#9CA3AF]">Progresso do follow-up</span>
                          <span className="text-[10px] font-medium text-[#9CA3AF]">{lead.follow_up_count || 0} de 6</span>
                        </div>
                        <div className="flex gap-1.5">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={cn(
                              'flex-1 h-[5px] rounded-full',
                              i < (lead.follow_up_count || 0) ? 'bg-[#C8E645]' : 'bg-[#F3F4F6]'
                            )} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ═══ TAB: RULES ═══ */}
          {tab === 'rules' && (
            rules.length === 0 ? (
              <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#C8E645]/10 flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-7 h-7 text-[#C8E645]" />
                </div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-1">Nenhuma regra configurada</h3>
                <p className="text-[13px] text-[#9CA3AF] mb-4">Configure regras para automatizar o follow-up</p>
                <button onClick={openCreateRule}
                  className="px-5 py-2.5 bg-[#1B3A2D] text-white text-[13px] font-bold rounded-full hover:opacity-90 active:scale-95 transition-all">
                  + Nova regra
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.09)] transition-all duration-200 group overflow-hidden">
                    {/* Collapsed header */}
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-[10px] bg-[#C8E645]/15 flex items-center justify-center flex-shrink-0">
                          <RefreshCw className="w-5 h-5 text-[#7A9E00]" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-[14px] font-bold text-[#111827]">
                              {getConditionLabel(rule.trigger_condition)}
                            </h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                              Após {rule.days_after} {rule.days_after === 1 ? 'dia' : 'dias'}
                            </span>
                            {rule.use_testimonial && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C8E645]/15 text-[#5A6B00]">
                                Com depoimento
                              </span>
                            )}
                            {!rule.is_active && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EF4444]/10 text-[#DC2626]">
                                Inativa
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-[#6B7280] mt-1 line-clamp-1">{rule.message_template || 'Sem template definido'}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => { setExpanded(expanded === rule.id ? null : rule.id); setEditingTemplate(null) }}
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                              expanded === rule.id
                                ? 'bg-[#C8E645]/15 text-[#7A9E00]'
                                : 'text-[#C0C7D0] hover:bg-[#F3F4F6] hover:text-[#6B7280]'
                            )}
                          >
                            <ChevronDown className={cn('w-4 h-4 transition-transform', expanded === rule.id && 'rotate-180')} />
                          </button>
                          <button
                            onClick={() => toggleRule(rule.id, !rule.is_active)}
                            className={cn(
                              'w-9 h-5 rounded-full transition-all duration-200 relative flex-shrink-0',
                              rule.is_active ? 'bg-[#C8E645]' : 'bg-[#E5E7EB]'
                            )}
                          >
                            <div className={cn(
                              'w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-all duration-200',
                              rule.is_active ? 'left-[18px]' : 'left-[3px]'
                            )} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded section */}
                    {expanded === rule.id && (
                      <div className="border-t border-[#F5F5F5] bg-[#FAFBFC] animate-dropdown-in">
                        {/* Template — editable inline */}
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Template da mensagem</label>
                            {editingTemplate !== rule.id ? (
                              <button
                                onClick={() => { setEditingTemplate(rule.id); setTempTemplate(rule.message_template) }}
                                className="flex items-center gap-1.5 text-[12px] font-bold text-[#1B3A2D] bg-[#C8E645] px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.35)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(200,230,69,0.4)] active:scale-95 transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    await supabase.from('follow_up_rules').update({ message_template: tempTemplate }).eq('id', rule.id)
                                    setEditingTemplate(null)
                                    loadRules()
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#7A9E00] px-3 py-1.5 rounded-full hover:bg-[#5A6B00] active:scale-95 transition-all"
                                >
                                  <Check className="w-3 h-3" /> Salvar
                                </button>
                                <button
                                  onClick={() => setEditingTemplate(null)}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-[#6B7280] bg-[#F3F4F6] px-3 py-1.5 rounded-full hover:bg-[#E5E7EB] active:scale-95 transition-all"
                                >
                                  <X className="w-3 h-3" /> Cancelar
                                </button>
                              </div>
                            )}
                          </div>

                          {editingTemplate === rule.id ? (
                            <div>
                              <textarea
                                value={tempTemplate}
                                onChange={e => setTempTemplate(e.target.value)}
                                rows={3}
                                className="w-full bg-white border-[1.5px] border-[#C8E645] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] focus:ring-0 focus:outline-none focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all resize-none"
                                autoFocus
                              />
                              <div className="flex items-center flex-wrap gap-1.5 mt-3">
                                <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mr-1">Variáveis</span>
                                {['{nome}', '{primeiro_nome}', '{objetivo}', '{contexto}', '{nivel}', '{dias_sem_resposta}'].map(ph => (
                                  <button
                                    key={ph}
                                    type="button"
                                    onClick={() => setTempTemplate(prev => prev + ' ' + ph)}
                                    className="inline-flex items-center gap-0.5 text-[11px] font-medium font-mono bg-[#C8E645]/8 text-[#7A9E00] border border-[#C8E645]/20 px-2 py-1 rounded-lg hover:bg-[#C8E645]/15 hover:border-[#C8E645]/40 active:scale-95 transition-all"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    {ph.replace(/[{}]/g, '')}
                                  </button>
                                ))}
                                <form
                                  onSubmit={e => {
                                    e.preventDefault()
                                    const input = (e.target as HTMLFormElement).elements.namedItem('customVar') as HTMLInputElement
                                    const val = input.value.trim().replace(/\s+/g, '_').toLowerCase()
                                    if (val) { setTempTemplate(prev => prev + ' {' + val + '}'); input.value = '' }
                                  }}
                                  className="inline-flex items-center gap-1"
                                >
                                  <input
                                    name="customVar"
                                    placeholder="nova_variavel"
                                    className="w-[110px] text-[11px] font-mono bg-white border border-[#E5E7EB] text-[#374151] placeholder-[#C0C7D0] px-2 py-1 rounded-lg focus:border-[#C8E645] focus:ring-0 focus:outline-none transition-all"
                                  />
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-white bg-[#7A9E00] px-2 py-1 rounded-lg hover:bg-[#5A6B00] active:scale-95 transition-all"
                                  >
                                    <Plus className="w-2.5 h-2.5" /> Criar
                                  </button>
                                </form>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white rounded-[10px] border-[1.5px] border-[#E5E7EB] px-4 py-3">
                              <p className="text-[14px] text-[#374151] leading-relaxed whitespace-pre-wrap">
                                {rule.message_template || 'Nenhum template definido'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Live preview with sample data */}
                        {(editingTemplate === rule.id ? tempTemplate : rule.message_template)?.includes('{') && (
                          <div className="px-5 pb-4">
                            <div className="bg-[#C8E645]/5 rounded-[10px] border border-[#C8E645]/10 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Eye className="w-3.5 h-3.5 text-[#7A9E00]" />
                                <span className="text-[10px] font-bold text-[#7A9E00] uppercase tracking-[0.04em]">Preview com dados de exemplo</span>
                              </div>
                              <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap italic">
                                &ldquo;{previewFollowUpTemplate(editingTemplate === rule.id ? tempTemplate : rule.message_template)}&rdquo;
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Rule details grid */}
                        <div className="px-5 py-4 border-t border-[#F3F4F6]">
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Condição', value: getConditionLabel(rule.trigger_condition) },
                              { label: 'Dias após', value: `${rule.days_after} ${rule.days_after === 1 ? 'dia' : 'dias'}` },
                              { label: 'Prioridade', value: String(rule.priority) },
                            ].map(item => (
                              <div key={item.label} className="bg-white rounded-[10px] border border-[#EFEFEF] px-3 py-2.5">
                                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-0.5">{item.label}</p>
                                <p className="text-[13px] font-semibold text-[#111827]">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer actions */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#F3F4F6] bg-white rounded-b-[16px]">
                          <button
                            onClick={() => openEditRule(rule)}
                            className="flex items-center gap-2 text-[12px] font-semibold text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] px-4 py-2 rounded-full active:scale-95 transition-all"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#6B7280]" /> Editar tudo
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(rule.id)}
                            className="flex items-center gap-2 text-[12px] font-semibold text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#FEF2F2] px-4 py-2 rounded-full active:scale-95 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir regra
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* ═══ TAB: HISTORY ═══ */}
          {tab === 'history' && (
            history.length === 0 ? (
              <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-7 h-7 text-[#F59E0B]" />
                </div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-1">Nenhum envio registrado</h3>
                <p className="text-[13px] text-[#9CA3AF]">O histórico de follow-ups aparecerá aqui</p>
              </div>
            ) : (
              <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAFBFC] border-b border-[#F3F4F6]">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Lead</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden md:table-cell">Regra</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Mensagem</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden md:table-cell">Enviado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} className="border-b border-[#F5F5F5] last:border-b-0 hover:bg-[#FAFBFC] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <LeadAvatar name={(h.lead as any)?.name} username={(h.lead as any)?.instagram_username} photoUrl={(h.lead as any)?.profile_pic_url} size="sm" />
                            <span className="text-[13px] font-medium text-[#111827] truncate max-w-[140px]">
                              {(h.lead as any) ? getLeadDisplayName(h.lead as any) : 'Lead'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-[#6B7280] hidden md:table-cell">
                          {getConditionLabel((h.rule as any)?.trigger_condition || '')}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-[#6B7280] max-w-[300px] truncate">
                          {h.message_sent}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-[#9CA3AF] hidden md:table-cell whitespace-nowrap">
                          {format(new Date(h.sent_at), 'dd/MM/yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {/* ═══ MODAL: Create/Edit Rule ═══ */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className={cn(
          '[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden',
          'w-[calc(100vw-32px)] max-w-[500px] max-h-[calc(100vh-48px)] flex flex-col',
          'shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
        )}>
          <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
            <h3 className="text-[18px] font-bold text-[#111827]">{editingRule ? 'Editar regra' : 'Nova regra'}</h3>
            <button onClick={() => setRuleModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 dropdown-scroll px-6 pb-4 space-y-4">
            {/* Condition — custom dropdown */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Condição de disparo</label>
              <div>
                <button
                  ref={conditionTriggerRef}
                  type="button"
                  onClick={() => setConditionOpen(!conditionOpen)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3',
                    'bg-[#F7F8F9] border-[1.5px] rounded-[10px] text-left transition-all text-[14px]',
                    conditionOpen
                      ? 'border-[#C8E645] bg-white shadow-[0_0_0_3px_rgba(200,230,69,0.15)]'
                      : 'border-[#E5E7EB] hover:border-[#C8E645]/40',
                    selectedCondition ? 'text-[#111827] font-medium' : 'text-[#C0C7D0]'
                  )}
                >
                  <span>{selectedCondition?.label || 'Selecionar condição'}</span>
                  <ChevronDown className={cn('w-4 h-4 text-[#9CA3AF] transition-transform', conditionOpen && 'rotate-180')} />
                </button>
                <DropdownPortal open={conditionOpen} onClose={() => setConditionOpen(false)} triggerRef={conditionTriggerRef} minWidth={200} maxHeight={240}>
                  {CONDITION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setRuleForm(p => ({ ...p, trigger_condition: opt.value })); setConditionOpen(false) }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors',
                        ruleForm.trigger_condition === opt.value
                          ? 'text-[#111827] font-semibold bg-[#C8E645]/8'
                          : 'text-[#374151] hover:bg-[#F7F8F9]'
                      )}
                    >
                      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {ruleForm.trigger_condition === opt.value && <Check className="w-3.5 h-3.5 text-[#C8E645]" />}
                      </div>
                      {opt.label}
                    </button>
                  ))}
                </DropdownPortal>
              </div>
            </div>

            {/* Days after */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Dias após a condição</label>
              <input
                type="number"
                min="1"
                value={ruleForm.days_after}
                onChange={e => setRuleForm(p => ({ ...p, days_after: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all"
              />
            </div>

            {/* Message template */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Template da mensagem</label>
              <textarea
                rows={3}
                value={ruleForm.message_template}
                onChange={e => setRuleForm(p => ({ ...p, message_template: e.target.value }))}
                placeholder="Oi {nome}, vi que você busca {objetivo}..."
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all resize-none"
              />

              {/* Live preview */}
              {ruleForm.message_template && ruleForm.message_template.includes('{') && (
                <div className="mt-2 bg-[#C8E645]/5 rounded-[10px] border border-[#C8E645]/10 p-3 animate-dropdown-in">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Eye className="w-3 h-3 text-[#7A9E00]" />
                    <span className="text-[10px] font-bold text-[#7A9E00] uppercase tracking-[0.04em]">Preview</span>
                  </div>
                  <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">
                    {previewFollowUpTemplate(ruleForm.message_template)}
                  </p>
                </div>
              )}

              {/* Placeholder insertion buttons */}
              <div className="flex items-center flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mr-1">Variáveis</span>
                {['{nome}', '{primeiro_nome}', '{objetivo}', '{contexto}', '{nivel}', '{dias_sem_resposta}'].map(ph => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => setRuleForm(p => ({ ...p, message_template: p.message_template + ' ' + ph }))}
                    className="inline-flex items-center gap-0.5 text-[11px] font-medium font-mono bg-[#C8E645]/8 text-[#7A9E00] border border-[#C8E645]/20 px-2 py-1 rounded-lg hover:bg-[#C8E645]/15 hover:border-[#C8E645]/40 active:scale-95 transition-all"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    {ph.replace(/[{}]/g, '')}
                  </button>
                ))}
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    const input = (e.target as HTMLFormElement).elements.namedItem('customVarModal') as HTMLInputElement
                    const val = input.value.trim().replace(/\s+/g, '_').toLowerCase()
                    if (val) { setRuleForm(p => ({ ...p, message_template: p.message_template + ' {' + val + '}' })); input.value = '' }
                  }}
                  className="inline-flex items-center gap-1"
                >
                  <input
                    name="customVarModal"
                    placeholder="nova_variavel"
                    className="w-[110px] text-[11px] font-mono bg-white border border-[#E5E7EB] text-[#374151] placeholder-[#C0C7D0] px-2 py-1 rounded-lg focus:border-[#C8E645] focus:ring-0 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-white bg-[#7A9E00] px-2 py-1 rounded-lg hover:bg-[#5A6B00] active:scale-95 transition-all"
                  >
                    <Plus className="w-2.5 h-2.5" /> Criar
                  </button>
                </form>
              </div>
            </div>

            {/* Use testimonial toggle */}
            <div className="flex items-center justify-between px-3 py-3 bg-[#F7F8F9] rounded-[10px]">
              <div>
                <p className="text-[13px] font-medium text-[#111827]">Incluir depoimento</p>
                <p className="text-[11px] text-[#9CA3AF]">Anexar depoimento de aluna com perfil similar</p>
              </div>
              <button
                type="button"
                onClick={() => setRuleForm(p => ({ ...p, use_testimonial: !p.use_testimonial }))}
                className={cn(
                  'w-10 h-6 rounded-full transition-all duration-200 relative flex-shrink-0',
                  ruleForm.use_testimonial ? 'bg-[#C8E645]' : 'bg-[#E5E7EB]'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-all duration-200',
                  ruleForm.use_testimonial ? 'left-5' : 'left-1'
                )} />
              </button>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Prioridade</label>
              <input
                type="number"
                min="0"
                value={ruleForm.priority}
                onChange={e => setRuleForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3 flex-shrink-0">
            <button
              onClick={() => setRuleModalOpen(false)}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={saveRule}
              disabled={!canSaveRule || savingRule}
              className={cn(
                'flex-1 py-3 rounded-full text-[14px] font-bold transition-all',
                canSaveRule
                  ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]'
                  : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed'
              )}
            >
              {savingRule ? 'Salvando...' : editingRule ? 'Salvar alterações' : 'Criar regra'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL: Delete Confirm ═══ */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="[&>button]:hidden bg-white rounded-[20px] p-6 w-[380px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] text-center">
          <div className="w-14 h-14 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-[#EF4444]" />
          </div>
          <h3 className="text-[18px] font-bold text-[#111827] mb-1">Excluir regra?</h3>
          <p className="text-[13px] text-[#6B7280] mb-6">Essa ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] transition-all">Cancelar</button>
            <button onClick={() => deleteConfirm && deleteRule(deleteConfirm)} className="flex-1 py-3 bg-[#EF4444] text-white rounded-full text-[14px] font-bold hover:bg-[#DC2626] active:scale-[0.98] transition-all">Excluir</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
