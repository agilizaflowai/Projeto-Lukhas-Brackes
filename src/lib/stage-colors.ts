import type { LeadStage, MessageStatus, CallResult } from './types'

export const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; border: string; label: string }> = {
  novo: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Novo' },
  lead_frio: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Lead Frio' },
  rapport: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Rapport' },
  social_selling: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', label: 'Social Selling' },
  spin: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'SPIN' },
  call_agendada: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Call Agendada' },
  fechado: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Fechado' },
  perdido: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Perdido' },
  follow_up: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', label: 'Follow-up' },
}

export const MESSAGE_STATUS_COLORS: Record<MessageStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pendente' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Aprovado' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Enviado' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Rejeitado' },
}

export const CALL_RESULT_COLORS: Record<CallResult, { bg: string; text: string; label: string }> = {
  fechou: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Fechou' },
  nao_fechou: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Não Fechou' },
  reagendar: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Reagendar' },
  no_show: { bg: 'bg-slate-50', text: 'text-slate-700', label: 'No-show' },
}

export const ASSIGNED_COLORS: Record<string, { bg: string; text: string }> = {
  ia: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  lukhas: { bg: 'bg-pink-50', text: 'text-pink-700' },
  assistente: { bg: 'bg-blue-50', text: 'text-blue-700' },
}
