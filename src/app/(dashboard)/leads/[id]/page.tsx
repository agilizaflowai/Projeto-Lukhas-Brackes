'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { InlineDatePicker } from '@/components/common/InlineDatePicker'
import { DropdownPortal } from '@/components/common/DropdownPortal'
import { cn } from '@/lib/utils'
import {
  ExternalLink, UserCheck, Bot, Send, Calendar, StickyNote,
  RefreshCw, ArrowRight, MessageSquare, Clock, Phone, User,
  X, Plus, Check, ChevronDown, Smile, Mic, Download, Loader2, XCircle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import dynamic from 'next/dynamic'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Lead, Message, ActivityLog, Call, LeadStage } from '@/lib/types'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

const STAGE_OPTIONS: { value: LeadStage; label: string; color: string }[] = [
  { value: 'novo', label: 'Novo', color: '#3B82F6' },
  { value: 'lead_frio', label: 'Lead Frio', color: '#6B7280' },
  { value: 'rapport', label: 'Rapport', color: '#A855F7' },
  { value: 'social_selling', label: 'Social Selling', color: '#EC4899' },
  { value: 'spin', label: 'SPIN', color: '#F97316' },
  { value: 'call_agendada', label: 'Call Agendada', color: '#FACC15' },
  { value: 'fechado', label: 'Fechado', color: '#10B981' },
  { value: 'perdido', label: 'Perdido', color: '#EF4444' },
  { value: 'follow_up', label: 'Follow-up', color: '#06B6D4' },
]

import { getActivityConfig, getActivityDetail } from '@/lib/activity-config'

function getTagStyle(tag: string): string {
  const t = tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (['emagrecer', 'emagrecimento', 'perder peso'].some(k => t.includes(k))) return 'bg-[#D7F5E1] text-[#006E33]'
  if (['hipertrofia', 'massa'].some(k => t.includes(k))) return 'bg-[#E0F2FE] text-[#0369A1]'
  if (['saude', 'qualidade'].some(k => t.includes(k))) return 'bg-[#FEF3C7] text-[#92400E]'
  if (['performance', 'atleta'].some(k => t.includes(k))) return 'bg-[#FEE2E2] text-[#991B1B]'
  return 'bg-[#F3F4F6] text-[#374151]'
}

function InlineSelect({ value, options, onChange, placeholder }: {
  value: string; options: { value: string; label: string; color?: string }[]; onChange: (v: string) => void; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = options.find(o => o.value === value)

  return (
    <div>
      <button
        ref={triggerRef}
        type="button" onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-3 bg-[#F7F8F9] rounded-[10px] border-[1.5px] border-[#E5E7EB]',
          'hover:border-[#C8E645]/40 transition-all text-left text-[13px]',
          open && 'border-[#C8E645] shadow-[0_0_0_3px_rgba(200,230,69,0.12)]',
        )}
      >
        {selected?.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />}
        <span className={cn('flex-1', selected ? 'font-medium text-[#111827]' : 'text-[#9CA3AF]')}>{selected?.label || placeholder || '—'}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#9CA3AF] transition-transform', open && 'rotate-180')} />
      </button>
      <DropdownPortal open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} minWidth={160} maxHeight={220}>
        {placeholder && (
          <button onClick={() => { onChange(''); setOpen(false) }}
            className={cn('w-full flex items-center gap-2 px-3 py-2.5 text-[13px] transition-colors', !value ? 'text-[#111827] font-semibold bg-[#F7F8F9]' : 'text-[#6B7280] hover:bg-[#F7F8F9]')}>
            <div className="w-4 h-4 flex items-center justify-center">{!value && <Check className="w-3 h-3 text-[#C8E645]" />}</div>
            {placeholder}
          </button>
        )}
        {options.map(opt => (
          <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
            className={cn('w-full flex items-center gap-2 px-3 py-2.5 text-[13px] transition-colors', value === opt.value ? 'text-[#111827] font-semibold bg-[#C8E645]/8' : 'text-[#374151] hover:bg-[#F7F8F9]')}>
            <div className="w-4 h-4 flex items-center justify-center">
              {value === opt.value ? <Check className="w-3 h-3 text-[#C8E645]" /> : opt.color ? <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} /> : null}
            </div>
            {opt.label}
          </button>
        ))}
      </DropdownPortal>
    </div>
  )
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useProfile()
  const supabase = createClient()

  const [lead, setLead] = useState<Lead | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') as 'conversa' | 'atividade' | 'calls' | null
  const [activeTab, setActiveTab] = useState<'conversa' | 'atividade' | 'calls'>(initialTab || 'conversa')

  const [callDialog, setCallDialog] = useState(false)
  const [callDate, setCallDate] = useState<Date | null>(null)
  const [callTime, setCallTime] = useState('')
  const [showCustomTime, setShowCustomTime] = useState(false)
  const [noteDialog, setNoteDialog] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [followUpDialog, setFollowUpDialog] = useState(false)
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const emojiRef = useRef<HTMLDivElement>(null)

  // Voice clone state
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [audioState, setAudioState] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioText, setAudioText] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    const [leadRes, msgsRes, actRes, callsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase.from('messages').select('*').eq('lead_id', id).order('created_at', { ascending: true }),
      supabase.from('activity_log').select('*').eq('lead_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('calls').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ])
    if (leadRes.data) setLead(leadRes.data)
    if (msgsRes.data) setMessages(msgsRes.data)
    if (actRes.data) setActivities(actRes.data)
    if (callsRes.data) setCalls(callsRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel(`lead-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${id}` },
        (payload: any) => { setMessages(prev => [...prev, payload.new as Message]) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${id}` },
        (payload: any) => { if (payload.new) setLead(payload.new as Lead) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, loadData])

  useEffect(() => {
    const container = chatEndRef.current?.parentElement
    if (container) container.scrollTop = container.scrollHeight
  }, [messages])

  // Check if voice clone is active
  useEffect(() => {
    supabase.from('ai_config')
      .select('is_active')
      .eq('config_type', 'voice_clone')
      .maybeSingle()
      .then(({ data }) => setVoiceEnabled(data?.is_active || false))
  }, [])

  // Get last outbound IA message
  const lastAIMessage = messages
    .filter(m => m.direction === 'outbound' && m.sent_by === 'ia' && m.status === 'sent')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null

  async function generateAudio() {
    if (!lastAIMessage) return
    setAudioState('generating')
    setAudioText(lastAIMessage.content)

    try {
      const { data: config } = await supabase.from('ai_config')
        .select('config_value')
        .eq('config_type', 'voice_clone')
        .maybeSingle()

      const { endpoint } = JSON.parse(config?.config_value || '{}')
      if (!endpoint) throw new Error('Endpoint não configurado')

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lastAIMessage.content, lead_id: id }),
      })

      if (!res.ok) throw new Error('Erro ao gerar áudio')

      const data = await res.json()
      setAudioUrl(data.audio_url)
      setAudioState('ready')
    } catch {
      setAudioState('error')
    }
  }

  async function sendViaWhatsApp() {
    if (!audioUrl || !lead) return

    try {
      const { data: config } = await supabase.from('ai_config')
        .select('config_value')
        .eq('config_type', 'voice_clone')
        .maybeSingle()

      const { endpoint } = JSON.parse(config?.config_value || '{}')

      await fetch(endpoint.replace('generate-audio', 'send-whatsapp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: audioUrl, lead_id: id, instagram_username: lead.instagram_username }),
      })
    } catch {
      // Error handled silently — Pedro's endpoint
    }
  }

  async function updateField(field: string, value: unknown) {
    if (!lead) return
    setLead({ ...lead, [field]: value } as Lead)
    await supabase.from('leads').update({ [field]: value }).eq('id', id)
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !lead) return
    setSending(true)
    await supabase.from('messages').insert({
      lead_id: id, direction: 'outbound', channel: 'instagram', content: newMessage,
      content_type: 'text', sent_by: profile?.role === 'admin' ? 'lukhas' : 'assistente', status: 'sent', approved: true,
    })
    setNewMessage('')
    setSending(false)
  }

  async function handleApproveMessage(msgId: string) {
    await supabase.from('messages').update({ status: 'approved', approved_by: profile?.name || 'user' }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'approved' } : m))
  }

  async function handleRejectMessage(msgId: string) {
    await supabase.from('messages').update({ status: 'rejected' }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'rejected' } : m))
  }

  async function handleScheduleCall() {
    if (!callDate || !callTime) return
    const [hours, minutes] = callTime.split(':').map(Number)
    const scheduledAt = new Date(callDate)
    scheduledAt.setHours(hours, minutes, 0, 0)
    await supabase.from('calls').insert({ lead_id: id, scheduled_at: scheduledAt.toISOString() })
    await supabase.from('activity_log').insert({ lead_id: id, action: 'call_scheduled', details: { scheduled_at: scheduledAt.toISOString(), lead_name: lead?.name || lead?.instagram_username }, created_by: profile?.name })
    setCallDialog(false); setCallDate(null); setCallTime(''); setShowCustomTime(false)
    loadData()
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    await supabase.from('activity_log').insert({ lead_id: id, action: 'note_added', details: { note: noteText, lead_name: lead?.name || lead?.instagram_username }, created_by: profile?.name })
    setNoteDialog(false); setNoteText(''); loadData()
  }

  async function handleSetFollowUp() {
    if (!followUpDate) return
    await updateField('next_follow_up_at', followUpDate.toISOString())
    setFollowUpDialog(false); setFollowUpDate(null)
  }

  function handleAddTag() {
    if (!tagInput.trim() || !lead) return
    updateField('tags', [...lead.tags, tagInput.trim()])
    setTagInput('')
  }

  if (loading) return <div className="space-y-4"><Skeleton className="skeleton-shimmer h-10 w-64" /><Skeleton className="skeleton-shimmer h-96" /></div>
  if (!lead) return <p className="text-[#9CA3AF]">Lead não encontrado.</p>

  const pendingMsgs = messages.filter(m => m.status === 'pending')
  const hasReadableUsername = lead.instagram_username && !lead.instagram_username.startsWith('ig_') && !/^\d{10,}$/.test(lead.instagram_username)
  const displayName = lead.name || (hasReadableUsername ? lead.instagram_username : 'Lead')
  const initials = displayName.slice(0, 2).toUpperCase()
  const currentStage = STAGE_OPTIONS.find(s => s.value === lead.stage)

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
      {/* LEFT: Profile Panel */}
      <aside className="w-full lg:w-[340px] flex-shrink-0 bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden max-h-[calc(100vh-120px)] lg:sticky lg:top-0 self-start">
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-120px)] dropdown-scroll">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4 mb-4">
            <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="xl" className="ring-[3px] ring-[#C8E645]/30" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-bold text-[#111827] truncate">{displayName}</h2>
              {hasReadableUsername && <p className="text-[13px] text-[#9CA3AF]">@{lead.instagram_username}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {lead.follower_count != null && (
                  <span className="text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{lead.follower_count.toLocaleString()} seg.</span>
                )}
                {lead.follows_lukhas && (
                  <span className="text-[11px] font-semibold text-[#059669] bg-[#10B981]/10 px-2 py-0.5 rounded-full">Te segue</span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {lead.bio && <p className="text-[13px] text-[#374151] leading-relaxed mb-3 bg-[#F7F8F9] rounded-[10px] p-3">{lead.bio}</p>}

          {hasReadableUsername && (
            <a href={`https://instagram.com/${lead.instagram_username}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280] hover:text-[#374151] mb-5 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir no Instagram
            </a>
          )}

          <div className="h-px bg-[#F3F4F6] mb-5" />

          <div className="space-y-4">
            {/* Stage */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Etapa</label>
              <InlineSelect value={lead.stage} options={STAGE_OPTIONS} onChange={v => updateField('stage', v)} />
            </div>

            {/* Assigned */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-2 block">Responsável</label>
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-[10px] mb-2',
                lead.assigned_to === 'ia'
                  ? 'bg-[#C8E645]/10'
                  : lead.assigned_to === 'lukhas'
                    ? 'bg-[#1B3A2D]/5'
                    : 'bg-[#3B82F6]/5'
              )}>
                {lead.assigned_to === 'ia' ? (
                  <>
                    <Bot className="w-4 h-4 text-[#7A9E00]" />
                    <span className="text-[13px] font-semibold text-[#7A9E00]">IA está respondendo</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-[#374151]" />
                    <span className="text-[13px] font-semibold text-[#374151]">
                      {lead.assigned_to === 'lukhas' ? 'Lukhas' : profile?.name || 'Assistente'}
                    </span>
                  </>
                )}
              </div>
              {lead.assigned_to === 'ia' ? (
                <button onClick={async () => {
                  const newAssigned = profile?.role === 'admin' ? 'lukhas' : 'assistente'
                  await updateField('assigned_to', newAssigned)
                  await supabase.from('activity_log').insert({
                    lead_id: id, action: 'human_takeover',
                    details: { taken_by: profile?.name || newAssigned, previous: lead?.assigned_to, lead_name: lead?.name || lead?.instagram_username },
                    created_by: profile?.name,
                  })
                }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-full text-[12px] font-bold text-[#374151] hover:bg-[#F7F8F9] hover:border-[#D1D5DB] active:scale-[0.98] transition-all">
                  <UserCheck className="w-4 h-4" /> Eu respondo
                </button>
              ) : (
                <button onClick={async () => {
                  await updateField('assigned_to', 'ia')
                  await supabase.from('activity_log').insert({
                    lead_id: id, action: 'human_takeover',
                    details: { taken_by: 'IA', previous: lead?.assigned_to, lead_name: lead?.name || lead?.instagram_username },
                    created_by: profile?.name,
                  })
                }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#C8E645] rounded-full text-[12px] font-bold text-[#111827] shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-[0.98] transition-all">
                  <Bot className="w-4 h-4" /> Devolver pra IA
                </button>
              )}
            </div>

            <div className="h-px bg-[#F3F4F6]" />

            {/* Classification */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Gênero</label>
              <InlineSelect value={lead.gender || ''} placeholder="—"
                options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }, { value: 'outro', label: 'Outro' }]}
                onChange={v => updateField('gender', v || null)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Nível Fitness</label>
              <InlineSelect value={lead.fitness_level || ''} placeholder="—"
                options={[{ value: 'sedentario', label: 'Sedentário' }, { value: 'iniciante', label: 'Iniciante' }, { value: 'intermediario', label: 'Intermediário' }, { value: 'avancado', label: 'Avançado' }]}
                onChange={v => updateField('fitness_level', v || null)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Objetivo</label>
              <InlineSelect value={lead.goal || ''} placeholder="—"
                options={[{ value: 'emagrecer', label: 'Emagrecer' }, { value: 'hipertrofia', label: 'Hipertrofia' }, { value: 'saude', label: 'Saúde' }, { value: 'performance', label: 'Performance' }]}
                onChange={v => updateField('goal', v || null)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Contexto</label>
              <input value={lead.life_context || ''} placeholder="mãe, estudante, etc"
                onChange={e => updateField('life_context', e.target.value || null)}
                className="w-full bg-[#F7F8F9] border border-[#EFEFEF] rounded-[10px] px-3 py-2.5 text-[13px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none transition-all" />
            </div>

            <div className="h-px bg-[#F3F4F6]" />

            {/* Tags */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-2 block">Tags</label>
              {lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {lead.tags.map(tag => (
                    <span key={tag} className={cn('text-[10px] font-bold px-2 py-1 rounded-[6px] flex items-center gap-1', getTagStyle(tag))}>
                      {tag}
                      <button onClick={() => updateField('tags', lead.tags.filter(t => t !== tag))} className="hover:text-[#EF4444] transition-colors"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Nova tag"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                  className="flex-1 h-[44px] bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all" />
                <button onClick={handleAddTag} disabled={!tagInput.trim()}
                  className={cn(
                    'w-[44px] h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all',
                    tagInput.trim()
                      ? 'bg-[#C8E645] text-[#111827] shadow-[0_2px_6px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95'
                      : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed'
                  )}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="h-px bg-[#F3F4F6]" />

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={() => setCallDialog(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-[#374151] bg-[#F7F8F9] rounded-[10px] border border-[#EFEFEF] hover:bg-[#C8E645]/8 hover:border-[#C8E645]/30 active:scale-[0.98] transition-all">
                <Calendar className="w-4 h-4 text-[#6B7280]" /> Agendar Call
              </button>
              <button onClick={() => setNoteDialog(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-[#374151] bg-[#F7F8F9] rounded-[10px] border border-[#EFEFEF] hover:bg-[#C8E645]/8 hover:border-[#C8E645]/30 active:scale-[0.98] transition-all">
                <StickyNote className="w-4 h-4 text-[#6B7280]" /> Adicionar Nota
              </button>
              <button onClick={() => setFollowUpDialog(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-[#374151] bg-[#F7F8F9] rounded-[10px] border border-[#EFEFEF] hover:bg-[#C8E645]/8 hover:border-[#C8E645]/30 active:scale-[0.98] transition-all">
                <RefreshCw className="w-4 h-4 text-[#6B7280]" /> Marcar Follow-up
              </button>
            </div>

            {/* Meta */}
            <p className="text-[11px] text-[#C0C7D0] mt-4">
              Origem: {lead.source || '—'} · Entrada: {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          </div>
        </div>
      </aside>

      {/* RIGHT: Content */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden max-h-[calc(100vh-120px)] lg:sticky lg:top-0 self-start">
        {/* Tabs */}
        <div className="flex items-center border-b border-[#F3F4F6] px-1">
          {[
            { key: 'conversa' as const, label: `Conversa${pendingMsgs.length > 0 ? ` (${pendingMsgs.length})` : ''}` },
            { key: 'atividade' as const, label: 'Atividade' },
            { key: 'calls' as const, label: `Calls (${calls.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-3 text-[14px] font-medium transition-all relative',
                activeTab === tab.key ? 'text-[#111827] font-semibold' : 'text-[#9CA3AF] hover:text-[#6B7280]',
              )}>
              {tab.label}
              {activeTab === tab.key && <div className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#C8E645] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Tab: Conversa */}
        {activeTab === 'conversa' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 px-6 py-5 bg-[#FAFBFC] chat-scroll min-h-0">
              <div className="flex flex-col min-h-full">
                <div className="flex-1" />
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 opacity-40">
                    <MessageSquare className="w-8 h-8 text-[#D1D5DB] mb-2" />
                    <p className="text-[13px] text-[#9CA3AF]">Nenhuma mensagem ainda</p>
                  </div>
                )}
                {messages.length > 0 && messages.length <= 2 && (
                  <div className="flex flex-col items-center justify-center py-8 opacity-30">
                    <MessageSquare className="w-6 h-6 text-[#D1D5DB] mb-1" />
                    <p className="text-[12px] text-[#9CA3AF]">Início da conversa</p>
                  </div>
                )}
                <div className="space-y-4">
                  {messages.map(msg => {
                    const isLead = msg.direction === 'inbound'
                    const isIA = msg.sent_by === 'ia'
                    const isPending = msg.status === 'pending'

                    return (
                      <div key={msg.id} className={cn('flex gap-3', !isLead && 'flex-row-reverse')}>
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1 overflow-hidden">
                          {isLead ? (
                            <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="sm" />
                          ) : isIA ? (
                            <div className="w-full h-full rounded-full bg-[#C8E645]/15 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-[#7A9E00]" /></div>
                          ) : (
                            <div className="w-full h-full bg-[#1B3A2D] flex items-center justify-center text-[10px] text-white font-bold">L</div>
                          )}
                        </div>

                        {/* Bubble */}
                        <div className="max-w-[65%] min-w-[120px]">
                          <div className={cn('flex items-center gap-2 mb-1', !isLead && 'flex-row-reverse')}>
                            <span className="text-[11px] font-semibold text-[#374151]">
                              {isLead ? (lead.name?.split(' ')[0] || 'Lead') : isIA ? 'IA' : 'Lukhas'}
                            </span>
                            <span className="text-[10px] text-[#C0C7D0]">{format(new Date(msg.created_at), 'HH:mm')}</span>
                            {isIA && !isPending && (
                              <span className="text-[9px] font-bold text-[#7A9E00] bg-[#C8E645]/15 px-1.5 py-0.5 rounded">IA</span>
                            )}
                            {isPending && (
                              <span className="text-[9px] font-bold text-[#D97706] bg-[#F59E0B]/15 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" /> PENDENTE
                              </span>
                            )}
                          </div>

                          <div className={cn(
                            'px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap',
                            isLead
                              ? 'bg-white border border-[#EFEFEF] rounded-[16px] rounded-tl-[4px] text-[#374151]'
                              : isPending
                                ? 'bg-[#FFFBEB] border-[1.5px] border-[#F59E0B]/25 rounded-[16px] rounded-tr-[4px] text-[#374151]'
                                : isIA
                                  ? 'bg-[#F0FFF4] border border-[#C8E645]/20 rounded-[16px] rounded-tr-[4px] text-[#374151]'
                                  : 'bg-[#F7F8F9] border border-[#EFEFEF] rounded-[16px] rounded-tr-[4px] text-[#374151]',
                          )}>
                            {msg.content}
                          </div>

                          {isPending && (
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => handleApproveMessage(msg.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#C8E645] text-[#111827] text-[11px] font-bold rounded-full shadow-[0_2px_6px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all">
                                <Check className="w-3 h-3" /> Aprovar
                              </button>
                              <button onClick={() => handleRejectMessage(msg.id)}
                                className="flex items-center gap-1 px-3 py-1.5 border border-[#EF4444]/30 text-[#EF4444] text-[11px] font-semibold rounded-full hover:bg-[#FEF2F2] active:scale-95 transition-all">
                                <X className="w-3 h-3" /> Rejeitar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Typing indicator — only when IA is generating (last msg is inbound, assigned to IA, no pending yet) */}
                  {(() => {
                    const hasPending = messages.some(m => m.status === 'pending' && m.direction === 'outbound')
                    const lastMsg = messages[messages.length - 1]
                    const isLeadWaiting = lastMsg?.direction === 'inbound' && lead.assigned_to === 'ia' && !hasPending
                    if (!isLeadWaiting) return null
                    return (
                      <div className="flex gap-3 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1 overflow-hidden bg-[#C8E645]/15 flex items-center justify-center">
                          <Bot className="w-3.5 h-3.5 text-[#7A9E00]" />
                        </div>
                        <div className="bg-[#F7F8F9] border border-[#EFEFEF] rounded-[16px] rounded-tr-[4px] px-4 py-3 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-[6px] h-[6px] rounded-full bg-[#C8E645] animate-[typing-dot_1.4s_infinite]" style={{ animationDelay: '0ms' }} />
                            <div className="w-[6px] h-[6px] rounded-full bg-[#C8E645] animate-[typing-dot_1.4s_infinite]" style={{ animationDelay: '200ms' }} />
                            <div className="w-[6px] h-[6px] rounded-full bg-[#C8E645] animate-[typing-dot_1.4s_infinite]" style={{ animationDelay: '400ms' }} />
                          </div>
                          <span className="text-[12px] text-[#9CA3AF] font-medium">IA gerando resposta...</span>
                        </div>
                      </div>
                    )
                  })()}
                  <div ref={chatEndRef} />
                </div>
              </div>
            </div>
            {/* Message input */}
            <div className="px-6 py-3 bg-white border-t border-[#F3F4F6]">
              <div className="flex items-center gap-2">
                {/* Emoji button */}
                <div className="relative" ref={emojiRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                      showEmoji ? 'bg-[#C8E645]/15 text-[#7A9E00]' : 'text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280]',
                    )}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  {showEmoji && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                      <div className="absolute bottom-12 left-0 z-50 animate-dropdown-in">
                        <EmojiPicker
                          onEmojiClick={(emoji: any) => { setNewMessage(prev => prev + emoji.emoji); setShowEmoji(false) }}
                          width={320}
                          height={380}
                          searchPlaceHolder="Buscar emoji..."
                          previewConfig={{ showPreview: false }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Input */}
                <textarea
                  value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                  placeholder="Escrever mensagem..." rows={1} disabled={sending}
                  className={cn(
                    'flex-1 resize-none bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[14px]',
                    'px-4 py-2.5 text-[14px] text-[#374151] placeholder-[#C0C7D0]',
                    'focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white',
                    'focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)]',
                    'transition-all duration-200 max-h-[100px] overflow-y-auto',
                  )}
                  style={{ minHeight: '40px' }}
                />

                {/* Send */}
                <button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                    newMessage.trim()
                      ? 'bg-[#C8E645] text-[#111827] shadow-[0_2px_8px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-95'
                      : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed',
                  )}>
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Voice clone audio player */}
              {voiceEnabled && lastAIMessage && (
                <div className="border-t border-[#F5F5F5] pt-3 mt-1">
                  {audioState === 'idle' && (
                    <button
                      onClick={generateAudio}
                      className="flex items-center gap-2 text-[12px] font-semibold text-[#6B7280] hover:text-[#111827] bg-[#F7F8F9] hover:bg-[#F3F4F6] px-4 py-2.5 rounded-full border border-[#EFEFEF] transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      Gerar áudio com voz do Lukhas
                    </button>
                  )}

                  {audioState === 'generating' && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F8F9] rounded-[12px] border border-[#EFEFEF]">
                      <div className="w-10 h-10 rounded-full bg-[#C8E645]/15 flex items-center justify-center flex-shrink-0">
                        <Loader2 className="w-5 h-5 text-[#7A9E00] animate-spin" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827]">Gerando áudio...</p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5 line-clamp-1">&ldquo;{audioText}&rdquo;</p>
                      </div>
                    </div>
                  )}

                  {audioState === 'ready' && audioUrl && (
                    <div className="bg-[#F7F8F9] rounded-[14px] border border-[#EFEFEF] overflow-hidden">
                      <div className="px-4 pt-4 pb-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Mic className="w-3.5 h-3.5 text-[#7A9E00]" />
                          <span className="text-[10px] font-bold text-[#7A9E00] uppercase tracking-[0.04em]">Áudio gerado</span>
                        </div>
                        <p className="text-[12px] text-[#6B7280] line-clamp-2">&ldquo;{audioText}&rdquo;</p>
                      </div>

                      <div className="px-4 py-3">
                        <audio ref={audioRef} src={audioUrl} className="w-full h-[40px]" controls style={{ borderRadius: '10px', outline: 'none' }} />
                      </div>

                      <div className="flex items-center gap-2 px-4 py-3 border-t border-[#EFEFEF] bg-white">
                        <button
                          onClick={sendViaWhatsApp}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#C8E645] text-[#111827] text-[12px] font-bold rounded-full shadow-[0_2px_6px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Enviar via WhatsApp
                        </button>

                        <a
                          href={audioUrl}
                          download={`audio_${lead?.instagram_username || lead?.id || 'lead'}.mp3`}
                          className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E7EB] text-[#374151] text-[12px] font-semibold rounded-full hover:bg-[#F7F8F9] active:scale-95 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar MP3
                        </a>

                        <button
                          onClick={() => { setAudioState('idle'); setAudioUrl(null); generateAudio() }}
                          className="flex items-center gap-1.5 px-3 py-2 text-[#6B7280] text-[12px] font-medium rounded-full hover:bg-[#F3F4F6] active:scale-95 transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Regenerar
                        </button>

                        <button
                          onClick={() => { setAudioState('idle'); setAudioUrl(null) }}
                          className="ml-auto text-[#C0C7D0] hover:text-[#6B7280] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {audioState === 'error' && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#FEF2F2] rounded-[12px] border border-[#EF4444]/15">
                      <XCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-[#DC2626]">Erro ao gerar áudio</p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">Verifique se o clone de voz está configurado corretamente</p>
                      </div>
                      <button
                        onClick={() => setAudioState('idle')}
                        className="text-[12px] font-semibold text-[#6B7280] hover:text-[#111827] px-3 py-1.5 rounded-full hover:bg-white transition-all"
                      >
                        Tentar de novo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Atividade */}
        {activeTab === 'atividade' && (
          <div className="flex-1 p-6 overflow-y-auto dropdown-scroll min-h-0">
            {activities.length === 0 ? (
              <p className="text-center text-[#9CA3AF] text-[13px] py-12">Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-4">
                {activities.map(act => {
                  const cfg = getActivityConfig(act.action)
                  const Icon = cfg.icon
                  const description = getActivityDetail(act.action, act.details)
                  return (
                    <div key={act.id} className="flex gap-3">
                      <div className={cn('flex items-center justify-center w-8 h-8 rounded-full shrink-0', cfg.badgeColor.split(' ')[0])}>
                        <Icon className={cn('w-3.5 h-3.5', cfg.badgeColor.split(' ')[1])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#374151]">{description}</p>
                        <p className="text-[11px] text-[#9CA3AF]">
                          {act.created_by && `${act.created_by} · `}
                          {formatDistanceToNow(new Date(act.created_at), { locale: ptBR, addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Calls */}
        {activeTab === 'calls' && (
          <div className="flex-1 p-6 overflow-y-auto dropdown-scroll min-h-0">
            {calls.length === 0 ? (
              <p className="text-center text-[#9CA3AF] text-[13px] py-12">Nenhuma call registrada</p>
            ) : (
              <div className="space-y-3">
                {calls.map(call => (
                  <div key={call.id} className="flex items-center gap-4 p-3.5 rounded-[12px] border border-[#EFEFEF] hover:bg-[#FAFBFC] transition-colors">
                    <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-[#6D28D9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#111827]">
                        {call.scheduled_at ? format(new Date(call.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem data'}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF]">
                        {call.duration_minutes ? `${call.duration_minutes} min` : 'Duração não registrada'}
                        {call.ai_analysis?.score != null && ` · Score: ${call.ai_analysis.score}/10`}
                      </p>
                    </div>
                    {call.result && (
                      <span className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 rounded-[6px] capitalize shrink-0',
                        call.result === 'fechou' ? 'bg-[#10B981]/10 text-[#059669]' : 'bg-[#F3F4F6] text-[#6B7280]',
                      )}>
                        {call.result.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog: Agendar Call */}
      <Dialog open={callDialog} onOpenChange={setCallDialog}>
        <DialogContent className={cn('[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[440px] max-h-[calc(100vh-48px)] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.15)]')}>
          <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
            <h3 className="text-[18px] font-bold text-[#111827]">Agendar Call</h3>
            <button onClick={() => { setCallDialog(false); setCallDate(null); setCallTime(''); setShowCustomTime(false) }} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 dropdown-scroll">
            <div className="px-6 mb-4">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2 block">Data</label>
              <div className="bg-[#F7F8F9] rounded-[12px] p-3 border border-[#EFEFEF]">
                <InlineDatePicker selected={callDate} onSelect={setCallDate} />
              </div>
              {callDate && (
                <p className="text-[12px] text-[#6B7280] mt-1.5 pl-1">{format(callDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              )}
            </div>
            <div className="px-6 mb-4">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2 block">Horário</label>
              <div className="grid grid-cols-4 gap-2">
                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(time => (
                  <button key={time} type="button" onClick={() => { setCallTime(time); setShowCustomTime(false) }}
                    className={cn('py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-150',
                      callTime === time && !showCustomTime ? 'bg-[#C8E645] text-[#111827] font-bold shadow-[0_2px_8px_rgba(200,230,69,0.3)]' : 'bg-[#F7F8F9] text-[#374151] border border-[#EFEFEF] hover:border-[#C8E645]/40')}>
                    {time}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setShowCustomTime(!showCustomTime)}
                className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#111827] transition-colors group">
                <Clock className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#7A9E00] transition-colors" />
                {showCustomTime ? 'Fechar' : 'Outro horário'}
              </button>
              {showCustomTime && (
                <div className="mt-2 animate-dropdown-in">
                  <div className="relative">
                    <input
                      type="text" inputMode="numeric" placeholder="HH:MM" maxLength={5}
                      value={callTime}
                      onChange={e => {
                        let v = e.target.value.replace(/[^\d:]/g, '')
                        const digits = v.replace(/:/g, '')
                        if (digits.length >= 3) v = digits.slice(0, 2) + ':' + digits.slice(2, 4)
                        if (v.length > 5) v = v.slice(0, 5)
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
          </div>
          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3 flex-shrink-0">
            <button onClick={() => { setCallDialog(false); setCallDate(null); setCallTime(''); setShowCustomTime(false) }}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all">Cancelar</button>
            <button onClick={handleScheduleCall} disabled={!callDate || !callTime}
              className={cn('flex-1 py-3 rounded-full text-[14px] font-bold transition-all',
                callDate && callTime ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]' : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed')}>
              Agendar Call
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar Nota */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className={cn('[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]')}>
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h3 className="text-[18px] font-bold text-[#111827]">Adicionar Nota</h3>
            <button onClick={() => { setNoteDialog(false); setNoteText('') }} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>
          <div className="px-6 mb-2">
            <textarea
              value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Escreva uma nota sobre este lead..."
              rows={5}
              className={cn(
                'w-full resize-none bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[14px]',
                'px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0]',
                'focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white',
                'focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)]',
                'transition-all duration-200',
              )}
            />
            <p className="text-[11px] text-[#C0C7D0] mt-1.5 pl-1">A nota ficará visível na aba Atividade.</p>
          </div>
          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3">
            <button onClick={() => { setNoteDialog(false); setNoteText('') }}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all">Cancelar</button>
            <button onClick={handleAddNote} disabled={!noteText.trim()}
              className={cn('flex-1 py-3 rounded-full text-[14px] font-bold transition-all',
                noteText.trim() ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]' : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed')}>
              Salvar Nota
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Marcar Follow-up */}
      <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
        <DialogContent className={cn('[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[440px] max-h-[calc(100vh-48px)] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.15)]')}>
          <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
            <h3 className="text-[18px] font-bold text-[#111827]">Marcar Follow-up</h3>
            <button onClick={() => { setFollowUpDialog(false); setFollowUpDate(null) }} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 dropdown-scroll">
            <div className="px-6 mb-4">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2 block">Data do próximo contato</label>
              <div className="bg-[#F7F8F9] rounded-[12px] p-3 border border-[#EFEFEF]">
                <InlineDatePicker selected={followUpDate} onSelect={setFollowUpDate} />
              </div>
              {followUpDate && (
                <p className="text-[12px] text-[#6B7280] mt-1.5 pl-1">{format(followUpDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              )}
            </div>
            <div className="mx-6 mb-4 flex items-start gap-2.5 p-3 bg-[#C8E645]/8 rounded-[10px]">
              <RefreshCw className="w-4 h-4 text-[#7A9E00] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#5A6B00] leading-relaxed">
                O sistema enviará lembretes automáticos na data selecionada.
              </p>
            </div>
          </div>
          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3 flex-shrink-0">
            <button onClick={() => { setFollowUpDialog(false); setFollowUpDate(null) }}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all">Cancelar</button>
            <button onClick={handleSetFollowUp} disabled={!followUpDate}
              className={cn('flex-1 py-3 rounded-full text-[14px] font-bold transition-all',
                followUpDate ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]' : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed')}>
              Salvar Follow-up
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
