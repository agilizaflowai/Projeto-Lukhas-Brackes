import { format } from 'date-fns'
import {
  UserPlus, ArrowRight, MessageSquare, CheckCircle, XCircle,
  Phone, PhoneCall, RefreshCcw, User, StickyNote, Info,
  Bot, Send, Sparkles, Tag, BarChart3, Clock, CheckSquare, Search,
  AlertTriangle, MessageCircle, Trash2, CheckCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STAGE_LABELS: Record<string, string> = {
  novo: 'Novo', lead_frio: 'Lead Frio', rapport: 'Rapport',
  social_selling: 'Social Selling', spin: 'SPIN', call_agendada: 'Call Agendada',
  fechado: 'Fechado', perdido: 'Perdido', follow_up: 'Follow-up',
}

export { STAGE_LABELS }

export interface ActivityConfig {
  badge: string
  badgeColor: string
  icon: LucideIcon
}

const ACTIVITY_MAP: Record<string, ActivityConfig> = {
  // Lead
  lead_created:        { badge: 'NOVO',      badgeColor: 'bg-[#C8E645]/15 text-[#5A6B00]', icon: UserPlus },
  lead_enriched:       { badge: 'PERFIL',    badgeColor: 'bg-[#8B5CF6]/10 text-[#7C3AED]', icon: Sparkles },
  lead_classified:     { badge: 'CLASSIF.',  badgeColor: 'bg-[#6366F1]/10 text-[#4F46E5]', icon: Tag },

  // Stage
  stage_changed:       { badge: 'MOVIDO',    badgeColor: 'bg-[#3B82F6]/10 text-[#2563EB]', icon: ArrowRight },

  // Message
  message_sent:        { badge: 'ENVIADO',   badgeColor: 'bg-[#10B981]/10 text-[#059669]', icon: Send },
  message_generated:   { badge: 'IA',        badgeColor: 'bg-[#C8E645]/15 text-[#5A6B00]', icon: Bot },
  message_approved:    { badge: 'APROVADO',  badgeColor: 'bg-[#10B981]/10 text-[#059669]', icon: CheckCircle },
  message_rejected:    { badge: 'REJEITADO', badgeColor: 'bg-[#EF4444]/10 text-[#DC2626]', icon: XCircle },
  message_received:    { badge: 'RECEBIDO',  badgeColor: 'bg-[#3B82F6]/10 text-[#2563EB]', icon: MessageSquare },

  // Call
  call_scheduled:      { badge: 'CALL',      badgeColor: 'bg-[#F59E0B]/10 text-[#D97706]', icon: Phone },
  call_completed:      { badge: 'CALL',      badgeColor: 'bg-[#10B981]/10 text-[#059669]', icon: PhoneCall },
  call_analyzed:       { badge: 'ANÁLISE',   badgeColor: 'bg-[#8B5CF6]/10 text-[#7C3AED]', icon: BarChart3 },
  call_deleted:        { badge: 'APAGADO',   badgeColor: 'bg-[#EF4444]/10 text-[#DC2626]', icon: Trash2 },

  // Follow-up
  follow_up_sent:      { badge: 'FOLLOW-UP', badgeColor: 'bg-[#06B6D4]/10 text-[#0891B2]', icon: RefreshCcw },
  follow_up_scheduled: { badge: 'AGENDADO',  badgeColor: 'bg-[#F59E0B]/10 text-[#D97706]', icon: Clock },

  // Human
  human_takeover:      { badge: 'ASSUMIDO',  badgeColor: 'bg-[#1B3A2D]/10 text-[#1B3A2D]', icon: User },
  note_added:          { badge: 'NOTA',      badgeColor: 'bg-[#F59E0B]/10 text-[#D97706]', icon: StickyNote },

  // Instagram
  comment_received:    { badge: 'COMENTÁRIO', badgeColor: 'bg-[#EC4899]/10 text-[#DB2777]', icon: MessageCircle },

  // System
  task_created:        { badge: 'TAREFA',    badgeColor: 'bg-[#6366F1]/10 text-[#4F46E5]', icon: CheckSquare },
  tasks_bulk_completed:{ badge: 'LIMPEZA',   badgeColor: 'bg-[#10B981]/10 text-[#059669]', icon: CheckCheck },
  profile_scraped:     { badge: 'SCRAPING',  badgeColor: 'bg-[#8B5CF6]/10 text-[#7C3AED]', icon: Search },
}

function translateAction(action: string): string {
  const words: Record<string, string> = {
    message: 'Mensagem', lead: 'Lead', call: 'Call', follow: 'Follow-up',
    stage: 'Etapa', task: 'Tarefa', note: 'Nota', human: 'Humano',
    generated: 'gerada', sent: 'enviada', received: 'recebida',
    created: 'criado', updated: 'atualizado', deleted: 'removido',
    approved: 'aprovada', rejected: 'rejeitada', enriched: 'enriquecido',
    classified: 'classificado', scheduled: 'agendada', completed: 'realizada',
    analyzed: 'analisada', scraped: 'coletado', takeover: 'assumida',
    up: '', added: 'adicionada',
  }
  return action
    .split('_')
    .map(w => words[w] ?? w)
    .filter(Boolean)
    .join(' ')
    .replace(/^\w/, c => c.toUpperCase())
}

export function getActivityConfig(action: string, details?: any): ActivityConfig {
  let config = ACTIVITY_MAP[action]

  if (!config) {
    const label = translateAction(action)
    return {
      badge: label.slice(0, 8).toUpperCase(),
      badgeColor: 'bg-[#6B7280]/10 text-[#4B5563]',
      icon: Info,
    }
  }

  if (details) {
    if (action === 'human_takeover') {
      if (details.returned_to === 'ia' || (typeof details.reason === 'string' && details.reason.toLowerCase().includes('timeout'))) {
        config = { badge: 'TIMEOUT', badgeColor: 'bg-[#6B7280]/10 text-[#4B5563]', icon: Clock }
      } else if (details.requested_by === 'ia' || (details.reason && !details.taken_by)) {
        config = { badge: 'ALERTA', badgeColor: 'bg-[#F59E0B]/10 text-[#D97706]', icon: AlertTriangle }
      }
    }
    if (action === 'note_added' && details.created_by === 'ia') {
      config = { badge: 'IA', badgeColor: 'bg-[#C8E645]/15 text-[#5A6B00]', icon: Bot }
    }
    if (action === 'follow_up_sent' && details.type === 'manual_task') {
      config = { badge: 'TAREFA', badgeColor: 'bg-[#6366F1]/10 text-[#4F46E5]', icon: CheckSquare }
    }
  }

  return config
}

export function getActivityDetail(action: string, details: any): string {
  switch (action) {
    case 'lead_created':
      return 'Entrou no funil'
    case 'lead_enriched':
      return 'Perfil enriquecido com dados do Instagram'
    case 'lead_classified':
      return 'Classificação automática realizada'
    case 'stage_changed': {
      const from = STAGE_LABELS[details?.from || details?.old_stage || '']
      const to = STAGE_LABELS[details?.to || details?.new_stage || '']
      if (from && to) return `${from} → ${to}`
      if (to) return `Movido para ${to}`
      return 'Mudou de etapa'
    }
    case 'message_sent': {
      const sender = details?.sent_by === 'ia' ? 'IA' : details?.sent_by || 'Sistema'
      return `Mensagem enviada por ${sender}`
    }
    case 'message_generated':
      return 'IA gerou resposta · aguardando aprovação'
    case 'message_received':
      return 'Enviou uma mensagem'
    case 'message_approved':
      return `Aprovada${details?.approved_by ? ` por ${details.approved_by}` : ''}`
    case 'message_rejected':
      return 'Mensagem rejeitada'
    case 'call_scheduled': {
      if (details?.scheduled_at) {
        try {
          const callDate = new Date(details.scheduled_at)
          const today = new Date()
          const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
          const timeStr = callDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          if (callDate.toDateString() === today.toDateString()) return `Call hoje às ${timeStr}`
          if (callDate.toDateString() === tomorrow.toDateString()) return `Call amanhã às ${timeStr}`
          return `Call em ${callDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`
        } catch { /* ignore */ }
      }
      return 'Call agendada'
    }
    case 'call_completed':
      return `Call realizada${details?.duration_minutes ? ` · ${details.duration_minutes} min` : ''}`
    case 'call_analyzed':
      return `Score: ${details?.score ?? '?'}/10`
    case 'call_deleted':
      return 'Registro de call apagado'
    case 'follow_up_sent': {
      if (details?.type === 'manual_task') {
        return 'Tarefa de follow-up criada pelo sistema'
      }
      return `Follow-up${details?.follow_up_count ? ` #${details.follow_up_count}` : ''} processado`
    }
    case 'follow_up_scheduled':
      return 'Follow-up agendado'
    case 'human_takeover': {
      // Timeout — devolvido pra IA
      if (details?.returned_to === 'ia' || (typeof details?.reason === 'string' && details.reason.toLowerCase().includes('timeout'))) {
        return 'Devolvido pra IA (timeout 30min sem resposta)'
      }
      // IA pediu atendimento humano (reason presente mas sem taken_by, ou requested_by)
      if (details?.requested_by === 'ia' || (details?.reason && !details?.taken_by)) {
        return `IA solicitou atendimento · ${details.reason}`
      }
      // Humano assumiu manualmente
      const raw = details?.taken_by || details?.new_assigned || 'Lukhas'
      const who = raw.toLowerCase() === 'ia' ? 'IA' : raw
      return `${who} assumiu a conversa`
    }
    case 'note_added': {
      const notePreview = details?.note?.slice(0, 50)
      if (details?.created_by === 'ia') {
        return notePreview ? `IA: "${notePreview}${details.note.length > 50 ? '...' : ''}"` : 'IA adicionou observação'
      }
      return notePreview ? `Nota: "${notePreview}${details.note?.length > 50 ? '...' : ''}"` : 'Nota adicionada'
    }
    case 'tasks_bulk_completed':
      return `${details?.count || 0} tarefas concluídas em massa${details?.completed_by ? ` por ${details.completed_by}` : ''}`
    case 'task_created':
      return 'Nova tarefa criada'
    case 'profile_scraped':
      return 'Dados do perfil coletados'
    case 'comment_received': {
      const comment = details?.comment_text?.slice(0, 50)
      return comment ? `Comentou: "${comment}${details.comment_text.length > 50 ? '...' : ''}"` : 'Comentou em uma publicação'
    }
    default:
      return translateAction(action)
  }
}

export function getActivityDescription(action: string, details: any, leadName?: string): string {
  const name = leadName || details?.lead_name || 'Lead'
  const detail = getActivityDetail(action, details)

  switch (action) {
    case 'stage_changed': {
      const from = STAGE_LABELS[details?.from || details?.old_stage || '']
      const to = STAGE_LABELS[details?.to || details?.new_stage || '']
      if (from && to) return `${name}: ${from} → ${to}`
      if (to) return `${name} movido para ${to}`
      return `${name} mudou de etapa`
    }
    case 'message_sent': {
      const sender = details?.sent_by === 'ia' ? 'IA' : details?.sent_by || 'Assistente'
      return `${sender} enviou mensagem para ${name}`
    }
    case 'message_approved': {
      const approver = details?.approved_by || 'Admin'
      return `${approver} aprovou mensagem para ${name}`
    }
    case 'human_takeover': {
      if (details?.returned_to === 'ia' || (typeof details?.reason === 'string' && details.reason.toLowerCase().includes('timeout'))) {
        return `${name} devolvido pra IA (timeout 30min sem resposta)`
      }
      if (details?.requested_by === 'ia' || (details?.reason && !details?.taken_by)) {
        return `IA solicitou atendimento para ${name} · ${details.reason}`
      }
      const raw = details?.taken_by || details?.new_assigned || 'Lukhas'
      const who = raw.toLowerCase() === 'ia' ? 'IA' : raw
      return `${who} assumiu a conversa com ${name}`
    }
    case 'follow_up_sent': {
      if (details?.type === 'manual_task') {
        return `Tarefa de follow-up criada para ${name}`
      }
      return `Follow-up${details?.follow_up_count ? ` #${details.follow_up_count}` : ''} processado para ${name}`
    }
    case 'call_scheduled': {
      if (details?.scheduled_at) {
        try {
          const date = new Date(details.scheduled_at)
          return `Call com ${name} agendada para ${format(date, "dd/MM 'às' HH:mm")}`
        } catch { /* ignore */ }
      }
      return `Call agendada com ${name}`
    }
    case 'note_added': {
      const preview = details?.note?.slice(0, 50)
      if (details?.created_by === 'ia') {
        return preview ? `IA observou sobre ${name}: "${preview}${details.note.length > 50 ? '...' : ''}"` : `IA adicionou observação sobre ${name}`
      }
      return preview ? `Nota sobre ${name}: "${preview}${details.note?.length > 50 ? '...' : ''}"` : `Nota adicionada em ${name}`
    }
    case 'comment_received': {
      const comment = details?.comment_text?.slice(0, 50)
      return comment ? `${name} comentou: "${comment}${details.comment_text.length > 50 ? '...' : ''}"` : `${name} comentou em uma publicação`
    }
    default:
      return `${name} — ${detail}`
  }
}
