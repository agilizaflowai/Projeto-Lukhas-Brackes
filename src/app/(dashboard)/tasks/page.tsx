'use client'

import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, getLeadDisplayName } from '@/lib/utils'
import {
  ListTodo, Check, SkipForward, CheckCircle, Copy, Plus, Search,
  Camera, Heart, MessageSquare, Phone, Bot, AlertTriangle, X,
  CheckCheck, Trash2, Loader2,
} from 'lucide-react'
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { InlineDatePicker } from '@/components/common/InlineDatePicker'
import Link from 'next/link'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Task, TaskStatus, Lead } from '@/lib/types'

function getInitials(name?: string | null): string {
  if (!name) return 'L'
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    interact_story: 'Interagir Story',
    interact_content: 'Interagir Conteúdo',
    manual_dm: 'DM Manual',
    call_review: 'Revisar Call',
    follow_up: 'Follow-up',
    send_message: 'Enviar Mensagem',
  }
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getTaskTypeStyle(type: string): { bg: string; badge: string } {
  switch (type) {
    case 'interact_story':
      return { bg: 'bg-[#8B5CF6]/10', badge: 'bg-[#8B5CF6]/10 text-[#7C3AED]' }
    case 'interact_content':
      return { bg: 'bg-[#3B82F6]/10', badge: 'bg-[#3B82F6]/10 text-[#2563EB]' }
    case 'manual_dm':
      return { bg: 'bg-[#06B6D4]/10', badge: 'bg-[#06B6D4]/10 text-[#0891B2]' }
    case 'call_review':
      return { bg: 'bg-[#F59E0B]/10', badge: 'bg-[#F59E0B]/10 text-[#D97706]' }
    case 'follow_up':
      return { bg: 'bg-[#10B981]/10', badge: 'bg-[#10B981]/10 text-[#059669]' }
    case 'send_message':
      return { bg: 'bg-[#3B82F6]/10', badge: 'bg-[#3B82F6]/10 text-[#2563EB]' }
    default:
      return { bg: 'bg-[#6B7280]/10', badge: 'bg-[#6B7280]/10 text-[#4B5563]' }
  }
}

function getTaskTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case 'interact_story':
      return <Camera className="w-5 h-5 text-[#7C3AED]" />
    case 'interact_content':
      return <Heart className="w-5 h-5 text-[#2563EB]" />
    case 'manual_dm':
      return <MessageSquare className="w-5 h-5 text-[#0891B2]" />
    case 'call_review':
      return <Phone className="w-5 h-5 text-[#D97706]" />
    case 'follow_up':
      return <Check className="w-5 h-5 text-[#059669]" />
    case 'send_message':
      return <MessageSquare className="w-5 h-5 text-[#2563EB]" />
    default:
      return <ListTodo className="w-5 h-5 text-[#4B5563]" />
  }
}

const TASK_TYPE_OPTIONS = [
  { value: 'interact_story', label: 'Interagir Story', icon: Camera, color: '#8B5CF6' },
  { value: 'interact_content', label: 'Interagir Conteúdo', icon: Heart, color: '#3B82F6' },
  { value: 'manual_dm', label: 'DM Manual', icon: MessageSquare, color: '#06B6D4' },
  { value: 'call_review', label: 'Revisar Call', icon: Phone, color: '#F59E0B' },
]

const EMPTY_FORM = { type: '', lead_id: '', title: '', description: '', suggested_text: '', due_at: '' }

const PAGE_SIZE = 20

export default function TasksPage() {
  const supabase = createClient()
  const { profile } = useProfile()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskStatus>('pending')
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [bulkAction, setBulkAction] = useState<'complete_all' | 'clear_done' | 'clear_skipped' | null>(null)
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [newTask, setNewTask] = useState(EMPTY_FORM)
  const [leadSearch, setLeadSearch] = useState('')
  const [leadResults, setLeadResults] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [saving, setSaving] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

  async function load() {
    const { data } = await supabase
      .from('tasks')
      .select('*, lead:leads(id, name, instagram_username, profile_pic_url)')
      .order('due_at', { ascending: true, nullsFirst: false })

    if (data) setTasks(data as Task[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function markDone(id: string) {
    setDismissing(id)
    await new Promise(r => setTimeout(r, 300))
    await supabase.from('tasks').update({
      status: 'done',
      completed_at: new Date().toISOString(),
    }).eq('id', id)
    setDismissing(null)
    load()
  }

  async function markSkipped(id: string) {
    setDismissing(id)
    await new Promise(r => setTimeout(r, 300))
    await supabase.from('tasks').update({
      status: 'skipped',
      completed_at: new Date().toISOString(),
    }).eq('id', id)
    setDismissing(null)
    load()
  }

  function copyText(text: string, taskId: string) {
    navigator.clipboard.writeText(text)
    setCopied(taskId)
    setTimeout(() => setCopied(null), 2000)
  }

  async function executeBulkAction() {
    if (!bulkAction) return
    setBulkProcessing(true)
    const adminName = profile?.name || 'admin'

    try {
      switch (bulkAction) {
        case 'complete_all': {
          const completedAt = new Date().toISOString()
          const { error } = await supabase
            .from('tasks')
            .update({ status: 'done', completed_at: completedAt })
            .eq('status', 'pending')
          if (error) throw error

          await supabase.from('activity_log').insert({
            lead_id: null,
            action: 'tasks_bulk_completed',
            details: { count: pendingCount, completed_by: adminName },
            created_by: adminName,
          })
          break
        }

        case 'clear_done': {
          const { error } = await supabase.from('tasks').delete().eq('status', 'done')
          if (error) throw error
          break
        }

        case 'clear_skipped': {
          const { error } = await supabase.from('tasks').delete().eq('status', 'skipped')
          if (error) throw error
          break
        }
      }

      setBulkAction(null)
      load()
    } catch (err) {
      console.error('Erro na ação em massa:', err)
    } finally {
      setBulkProcessing(false)
    }
  }

  function searchLeads(query: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!query.trim()) { setLeadResults([]); return }
    searchTimer.current = setTimeout(async () => {
      const q = query.toLowerCase().replace('@', '')
      const { data } = await supabase
        .from('leads')
        .select('id, name, instagram_username, profile_pic_url')
        .or(`name.ilike.%${q}%,instagram_username.ilike.%${q}%`)
        .limit(6) as { data: any }
      if (data) setLeadResults(data)
    }, 250)
  }

  async function createTask() {
    if (!newTask.type || !newTask.lead_id || !newTask.title.trim()) return
    setSaving(true)
    await supabase.from('tasks').insert({
      lead_id: newTask.lead_id,
      type: newTask.type,
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      suggested_text: newTask.suggested_text.trim() || null,
      status: 'pending',
      due_at: newTask.due_at ? new Date(newTask.due_at).toISOString() : null,
    })
    setSaving(false)
    setCreateOpen(false)
    setNewTask(EMPTY_FORM)
    setSelectedLead(null)
    setLeadSearch('')
    setLeadResults([])
    load()
  }

  // Counts
  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const skippedCount = tasks.filter(t => t.status === 'skipped').length

  const bulkConfig = (() => {
    switch (bulkAction) {
      case 'complete_all':
        return {
          icon: CheckCheck,
          iconBg: 'bg-[#10B981]/10',
          iconColor: 'text-[#059669]',
          title: 'Concluir todas as tarefas',
          description: `Tem certeza que deseja marcar ${pendingCount} ${pendingCount === 1 ? 'tarefa' : 'tarefas'} como ${pendingCount === 1 ? 'concluída' : 'concluídas'}? Isso indica que todas as ações foram realizadas.`,
          warning: null as string | null,
          confirmLabel: 'Concluir todas',
          confirmClass: 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px',
        }
      case 'clear_done':
        return {
          icon: Trash2,
          iconBg: 'bg-[#FEF2F2]',
          iconColor: 'text-[#EF4444]',
          title: 'Limpar tarefas concluídas',
          description: `Tem certeza que deseja remover ${doneCount} ${doneCount === 1 ? 'tarefa concluída' : 'tarefas concluídas'}? O histórico será mantido no activity log.`,
          warning: 'Essa ação não pode ser desfeita.' as string | null,
          confirmLabel: 'Limpar',
          confirmClass: 'bg-[#EF4444] text-white hover:bg-[#DC2626]',
        }
      case 'clear_skipped':
        return {
          icon: Trash2,
          iconBg: 'bg-[#FEF2F2]',
          iconColor: 'text-[#EF4444]',
          title: 'Limpar tarefas puladas',
          description: `Tem certeza que deseja remover ${skippedCount} ${skippedCount === 1 ? 'tarefa pulada' : 'tarefas puladas'}?`,
          warning: 'Essa ação não pode ser desfeita.' as string | null,
          confirmLabel: 'Limpar',
          confirmClass: 'bg-[#EF4444] text-white hover:bg-[#DC2626]',
        }
      default:
        return null
    }
  })()

  // Filter + sort
  const filtered = tasks
    .filter(t => t.status === filter)
    .sort((a, b) => {
      if (!a.due_at) return 1
      if (!b.due_at) return -1
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  // Reset page on filter change
  useEffect(() => { setPage(0) }, [filter])

  const pinBottomRef = useRef(false)

  function goToPage(target: number) {
    const next = Math.max(0, Math.min(totalPages - 1, target))
    if (next === safePage) return
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    pinBottomRef.current = true
    setPage(next)
  }

  useLayoutEffect(() => {
    if (!pinBottomRef.current) return
    pinBottomRef.current = false
    const main = document.querySelector('main')
    if (main) main.scrollTop = main.scrollHeight
  }, [safePage, paginated.length])

  const canCreate = !!(newTask.type && newTask.lead_id && newTask.title.trim())

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Tarefas</h2>
          <p className="text-[#414844] opacity-80 mt-1 text-[13px] sm:text-[15px]">
            <span className="font-semibold text-[#111827]">{pendingCount}</span> tarefas pendentes
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto hide-scrollbar -mx-3 px-3 lg:mx-0 lg:px-0 pb-1">
          {/* Filter tabs */}
          <div className="flex p-1 bg-[#F3F4F6] rounded-full flex-shrink-0">
            {([
              { value: 'pending' as TaskStatus, label: 'Pendentes', count: pendingCount },
              { value: 'done' as TaskStatus, label: 'Concluídas', count: doneCount },
              { value: 'skipped' as TaskStatus, label: 'Puladas', count: skippedCount },
            ]).map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'px-5 py-2 rounded-full text-[13px] transition-all',
                  filter === tab.value
                    ? 'bg-white text-[#111827] font-bold shadow-sm'
                    : 'text-[#6B7280] font-semibold hover:text-[#374151]'
                )}
              >
                {tab.label}
                <span className={cn(
                  'ml-1.5 text-[11px]',
                  tab.count > 0
                    ? filter === tab.value ? 'text-[#111827] font-semibold' : 'text-[#6B7280]'
                    : 'text-[#D1D5DB]'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Contextual bulk action — varies by tab */}
          {filter === 'pending' && (loading || pendingCount > 1) && (
            <button
              onClick={() => setBulkAction('complete_all')}
              disabled={loading || pendingCount <= 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#C8E645]/50 bg-[#C8E645]/8 text-[#1B3A2D] text-[13px] font-bold hover:bg-[#C8E645]/20 hover:border-[#C8E645] active:scale-95 transition-all flex-shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#C8E645]/8 disabled:hover:border-[#C8E645]/50"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Concluir todas</span>
              <span className="sm:hidden">Concluir</span>
            </button>
          )}

          {filter === 'done' && (loading || doneCount > 0) && (
            <button
              onClick={() => setBulkAction('clear_done')}
              disabled={loading || doneCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#FECACA] text-[#EF4444] text-[13px] font-bold hover:bg-[#FEF2F2] hover:border-[#EF4444] active:scale-95 transition-all flex-shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[#FECACA]"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar concluídas</span>
              <span className="sm:hidden">Limpar</span>
            </button>
          )}

          {filter === 'skipped' && (loading || skippedCount > 0) && (
            <button
              onClick={() => setBulkAction('clear_skipped')}
              disabled={loading || skippedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#FECACA] text-[#EF4444] text-[13px] font-bold hover:bg-[#FEF2F2] hover:border-[#EF4444] active:scale-95 transition-all flex-shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[#FECACA]"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar puladas</span>
              <span className="sm:hidden">Limpar</span>
            </button>
          )}

          {/* New task button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-[#1B3A2D] text-white px-5 py-2.5 rounded-full text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all flex-shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova tarefa</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 skeleton-shimmer rounded-[16px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C8E645]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-[#C8E645]" />
          </div>
          <h3 className="text-[16px] font-bold text-[#111827] mb-1">
            {filter === 'pending' ? 'Nenhuma tarefa pendente!' : filter === 'done' ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa pulada'}
          </h3>
          <p className="text-[13px] text-[#9CA3AF]">
            {filter === 'pending' ? 'Todas as tarefas foram concluídas' : 'Tarefas aparecerão aqui quando forem criadas'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(task => {
            const isOverdue = task.due_at && task.status === 'pending' && isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at))
            const isDueToday = task.due_at && task.status === 'pending' && isToday(new Date(task.due_at))
            const style = getTaskTypeStyle(task.type)

            return (
              <div
                key={task.id}
                className={cn(
                  'transition-all duration-300',
                  dismissing === task.id && 'opacity-0 -translate-x-4 scale-[0.98]'
                )}
              >
                <div className={cn(
                  'bg-white rounded-[16px] border border-[#EFEFEF] p-4 sm:p-5',
                  'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]',
                  'hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.09)]',
                  'transition-all duration-200',
                  task.status === 'done' && 'opacity-60',
                  task.status === 'skipped' && 'opacity-40',
                )}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Type icon */}
                    <div className={cn(
                      'w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0',
                      style.bg
                    )}>
                      {getTaskTypeIcon(task.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="mb-1">
                        <h3 className={cn(
                          'text-[14px] font-bold text-[#111827]',
                          task.status === 'done' && 'line-through text-[#6B7280]'
                        )}>
                          {task.title}
                        </h3>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-[13px] text-[#6B7280] mb-3">{task.description}</p>
                      )}

                      {/* Suggested text */}
                      {task.suggested_text && (
                        <div className="bg-[#F7F8F9] rounded-[10px] p-3 border border-[#EFEFEF] mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded bg-[#C8E645]/20 flex items-center justify-center">
                                <Bot className="w-2.5 h-2.5 text-[#7A9E00]" />
                              </div>
                              <span className="text-[10px] font-bold text-[#7A9E00] uppercase tracking-[0.04em]">Texto sugerido</span>
                            </div>
                            <button
                              onClick={() => copyText(task.suggested_text!, task.id)}
                              className="flex items-center gap-1 text-[11px] font-medium text-[#9CA3AF] hover:text-[#111827] px-2 py-1 rounded-md hover:bg-white transition-all"
                            >
                              {copied === task.id ? (
                                <><Check className="w-3 h-3 text-[#10B981]" /> Copiado!</>
                              ) : (
                                <><Copy className="w-3 h-3" /> Copiar</>
                              )}
                            </button>
                          </div>
                          <p className="text-[13px] text-[#374151] leading-relaxed">{task.suggested_text}</p>
                        </div>
                      )}

                      {/* Footer: lead + due date + status */}
                      <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF] flex-wrap">
                        {/* Lead */}
                        {task.lead && (
                          <Link
                            href={`/leads/${task.lead.id}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 hover:text-[#111827] transition-colors"
                          >
                            <LeadAvatar name={task.lead.name} username={task.lead.instagram_username} photoUrl={task.lead.profile_pic_url} size="xs" />
                            <span className="font-medium">{getLeadDisplayName(task.lead)}</span>
                          </Link>
                        )}

                        {/* Due date */}
                        {task.due_at && (
                          <>
                            {task.lead && <span className="text-[#E5E7EB]">&middot;</span>}
                            <span className={cn(
                              'flex items-center gap-1',
                              isOverdue ? 'text-[#EF4444] font-semibold' : isDueToday ? 'text-[#F59E0B] font-semibold' : ''
                            )}>
                              {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                              {isOverdue
                                ? `Vencida ${formatDistanceToNow(new Date(task.due_at), { locale: ptBR, addSuffix: true })}`
                                : isDueToday
                                  ? 'Vence hoje'
                                  : `Vence ${formatDistanceToNow(new Date(task.due_at), { locale: ptBR, addSuffix: true })}`
                              }
                            </span>
                          </>
                        )}

                        {/* Completed status */}
                        {task.status === 'done' && (
                          <>
                            <span className="text-[#E5E7EB]">&middot;</span>
                            <span className="text-[#10B981] font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Concluída
                            </span>
                          </>
                        )}
                        {task.status === 'skipped' && (
                          <>
                            <span className="text-[#E5E7EB]">&middot;</span>
                            <span className="text-[#6B7280] font-medium">Pulada</span>
                          </>
                        )}
                      </div>
                    </div>

                    </div>

                    {/* Actions — pending only */}
                    {task.status === 'pending' && (
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <button
                          onClick={() => markDone(task.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#C8E645] text-[#111827] text-[12px] font-bold rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" /> Feito
                        </button>
                        <button
                          onClick={() => markSkipped(task.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 border border-[#E5E7EB] text-[#6B7280] text-[12px] font-semibold rounded-full hover:bg-[#F7F8F9] hover:border-[#D1D5DB] active:scale-95 transition-all"
                        >
                          <SkipForward className="w-3.5 h-3.5" /> Pular
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="sticky bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 px-4 sm:px-5 py-3 bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <span className="text-[11px] sm:text-[12px] text-[#9CA3AF]">
            Mostrando {safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage === 0}
              onClick={() => goToPage(safePage - 1)}
              className="px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg disabled:opacity-40 transition-all"
            >
              &larr; Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(0, Math.min(safePage - 2, totalPages - 5))
              const p = start + i
              if (p >= totalPages) return null
              return (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-[12px] font-medium transition-all',
                    p === safePage ? 'bg-[#C8E645] text-[#111827] font-bold' : 'text-[#6B7280] hover:bg-[#F3F4F6]',
                  )}
                >
                  {p + 1}
                </button>
              )
            })}
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => goToPage(safePage + 1)}
              className="px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg disabled:opacity-40 transition-all"
            >
              Próximo &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={cn(
          '[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden',
          'w-[calc(100vw-32px)] max-w-[480px] max-h-[calc(100vh-48px)] flex flex-col',
          'shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
            <h3 className="text-[18px] font-bold text-[#111827]">Nova tarefa</h3>
            <button onClick={() => setCreateOpen(false)} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 dropdown-scroll px-6 pb-4 space-y-4">
            {/* Type */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-2 block">Tipo</label>
              <div className="grid grid-cols-2 gap-3">
                {TASK_TYPE_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewTask(p => ({ ...p, type: opt.value }))}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-3 rounded-[10px] border text-left transition-all',
                        newTask.type === opt.value
                          ? 'border-[#C8E645] bg-[#C8E645]/5 shadow-[0_0_0_2px_rgba(200,230,69,0.15)]'
                          : 'border-[#EFEFEF] bg-[#F7F8F9] hover:border-[#C8E645]/40'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${opt.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: opt.color }} />
                      </div>
                      <span className={cn(
                        'text-[13px]',
                        newTask.type === opt.value ? 'font-bold text-[#111827]' : 'font-medium text-[#374151]'
                      )}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lead search */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Lead</label>
              {!selectedLead ? (
                <>
                  <div className="relative">
                    <input
                      value={leadSearch}
                      onChange={e => { setLeadSearch(e.target.value); searchLeads(e.target.value) }}
                      placeholder="Buscar lead por nome ou @username..."
                      className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 pl-10 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                  </div>
                  {leadResults.length > 0 && (
                    <div className="mt-1 bg-white rounded-[12px] border border-[#EFEFEF] shadow-[0_4px_24px_rgba(0,0,0,0.10)] py-1 max-h-[160px] overflow-y-auto dropdown-scroll animate-dropdown-in">
                      {leadResults.map(lead => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => { setNewTask(p => ({ ...p, lead_id: lead.id })); setSelectedLead(lead); setLeadSearch(''); setLeadResults([]) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F7F8F9] transition-colors"
                        >
                          <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#111827] truncate">{getLeadDisplayName(lead)}</p>
                            {lead.name && <p className="text-[11px] text-[#9CA3AF]">@{lead.instagram_username}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#C8E645]/8 rounded-[8px]">
                  <LeadAvatar name={selectedLead.name} username={selectedLead.instagram_username} photoUrl={selectedLead.profile_pic_url} size="xs" />
                  <span className="text-[13px] font-medium text-[#111827] flex-1 truncate">
                    {getLeadDisplayName(selectedLead)}
                  </span>
                  <button
                    onClick={() => { setSelectedLead(null); setNewTask(p => ({ ...p, lead_id: '' })) }}
                    className="text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Título</label>
              <input
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Interagir com story da Ana"
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Descrição</label>
              <textarea
                value={newTask.description}
                onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="O que precisa ser feito..."
                rows={2}
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all resize-none"
              />
            </div>

            {/* Suggested text */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Texto sugerido (opcional)</label>
              <textarea
                value={newTask.suggested_text}
                onChange={e => setNewTask(p => ({ ...p, suggested_text: e.target.value }))}
                placeholder="Texto que o user pode copiar e enviar..."
                rows={2}
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all resize-none"
              />
            </div>

            {/* Due date */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-2 block">Data limite</label>
              <div className="bg-[#F7F8F9] rounded-[14px] p-4 border border-[#EFEFEF]">
                <InlineDatePicker
                  selected={newTask.due_at ? new Date(newTask.due_at) : null}
                  onSelect={(date) => setNewTask(p => ({ ...p, due_at: date.toISOString().split('T')[0] }))}
                />
              </div>
              {newTask.due_at && (
                <div className="flex items-center justify-between mt-1.5 pl-1">
                  <p className="text-[12px] text-[#6B7280]">
                    {format(new Date(newTask.due_at), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewTask(p => ({ ...p, due_at: '' }))}
                    className="text-[11px] text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3 flex-shrink-0">
            <button
              onClick={() => setCreateOpen(false)}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={createTask}
              disabled={!canCreate || saving}
              className={cn(
                'flex-1 py-3 rounded-full text-[14px] font-bold transition-all',
                canCreate
                  ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]'
                  : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed'
              )}
            >
              {saving ? 'Criando...' : 'Criar tarefa'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk action confirm */}
      <Dialog open={!!bulkAction} onOpenChange={(v) => { if (!v && !bulkProcessing) setBulkAction(null) }}>
        <DialogContent className="[&>button]:hidden bg-white rounded-[20px] p-0 w-[calc(100vw-32px)] max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          {bulkConfig && (
            <>
              <div className="p-6 text-center">
                <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4', bulkConfig.iconBg)}>
                  <bulkConfig.icon className={cn('w-6 h-6', bulkConfig.iconColor)} />
                </div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-1">{bulkConfig.title}</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{bulkConfig.description}</p>
                {bulkConfig.warning && (
                  <p className="text-[12px] text-[#9CA3AF] mt-2">{bulkConfig.warning}</p>
                )}
              </div>
              <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3">
                <button
                  onClick={() => setBulkAction(null)}
                  disabled={bulkProcessing}
                  className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeBulkAction}
                  disabled={bulkProcessing}
                  className={cn(
                    'flex-1 py-3 rounded-full text-[14px] font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2',
                    bulkConfig.confirmClass,
                  )}
                >
                  {bulkProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                  ) : (
                    bulkConfig.confirmLabel
                  )}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
