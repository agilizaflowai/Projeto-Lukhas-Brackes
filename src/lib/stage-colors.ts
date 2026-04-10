import type { LeadStage, MessageStatus, CallResult } from './types'

export const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; border: string; label: string }> = {
  novo:           { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/40',    label: 'Novo' },
  lead_frio:      { bg: 'bg-slate-500/15',   text: 'text-slate-400',   border: 'border-slate-500/40',   label: 'Lead Frio' },
  rapport:        { bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/40',  label: 'Rapport' },
  social_selling: { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  border: 'border-indigo-500/40',  label: 'Social Selling' },
  spin:           { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/40',   label: 'SPIN' },
  call_agendada:  { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/40',  label: 'Call Agendada' },
  fechado:        { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', label: 'Fechado' },
  perdido:        { bg: 'bg-rose-500/15',    text: 'text-rose-400',    border: 'border-rose-500/40',    label: 'Perdido' },
  follow_up:      { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    border: 'border-cyan-500/40',    label: 'Follow-up' },
}

export const MESSAGE_STATUS_COLORS: Record<MessageStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'bg-amber-500/15',   text: 'text-amber-400',   label: 'Pendente' },
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Aprovado' },
  sent:     { bg: 'bg-blue-500/15',    text: 'text-blue-400',    label: 'Enviado' },
  rejected: { bg: 'bg-rose-500/15',    text: 'text-rose-400',    label: 'Rejeitado' },
}

export const CALL_RESULT_COLORS: Record<CallResult, { bg: string; text: string; label: string }> = {
  fechou:      { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Fechou' },
  nao_fechou:  { bg: 'bg-rose-500/15',    text: 'text-rose-400',    label: 'Não Fechou' },
  reagendar:   { bg: 'bg-amber-500/15',   text: 'text-amber-400',   label: 'Reagendar' },
  no_show:     { bg: 'bg-slate-500/15',   text: 'text-slate-400',   label: 'No-show' },
}

export const ASSIGNED_COLORS: Record<string, { bg: string; text: string }> = {
  ia:         { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  lukhas:     { bg: 'bg-pink-500/15',    text: 'text-pink-400' },
  assistente: { bg: 'bg-blue-500/15',    text: 'text-blue-400' },
}
