'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { InlineDatePicker } from '@/components/common/InlineDatePicker'
import { DropdownPortal } from '@/components/common/DropdownPortal'
import { cn, sendApprovedMessage } from '@/lib/utils'
import {
  ExternalLink, UserCheck, Bot, Send, Calendar, StickyNote,
  RefreshCw, ArrowRight, MessageSquare, Clock, Phone, User,
  X, Plus, Check, ChevronDown, Smile, Mic, Download, Loader2, XCircle,
  Pencil, Info, MoreVertical, ShieldOff, ShieldCheck, AlertTriangle,
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

function TakeoverTimer({ leadId }: { leadId: string }) {
  const [minutesAgo, setMinutesAgo] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>

    async function loadTime() {
      const { data } = await supabase
        .from('activity_log')
        .select('created_at')
        .eq('lead_id', leadId)
        .eq('action', 'human_takeover')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        const mins = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 60000)
        setMinutesAgo(mins)
      }
    }

    loadTime()
    interval = setInterval(() => {
      setMinutesAgo(prev => prev !== null ? prev + 1 : null)
    }, 60000)

    return () => clearInterval(interval)
  }, [leadId])

  if (minutesAgo === null) return null

  const isUrgent = minutesAgo >= 25
  const isWarning = minutesAgo >= 15

  return (
    <div className={cn(
      'flex items-center gap-1.5 mt-0.5 text-[11px]',
      isUrgent ? 'text-[#EF4444] font-semibold' :
      isWarning ? 'text-[#D97706] font-medium' :
      'text-[#9CA3AF]',
    )}>
      <Clock className="w-3 h-3" />
      <span>Há {minutesAgo} min</span>
      {isUrgent && (
        <span className="inline-flex items-center gap-1 bg-[#EF4444]/10 text-[#DC2626] px-1.5 py-0.5 rounded-full text-[9px] font-bold">
          IA retoma em breve
        </span>
      )}
      {isWarning && !isUrgent && (
        <span className="text-[#D97706]">· Timeout em {30 - minutesAgo}min</span>
      )}
    </div>
  )
}

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
  const [followUpHistory, setFollowUpHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') as 'conversa' | 'atividade' | 'calls' | null
  const [activeTab, setActiveTab] = useState<'conversa' | 'atividade' | 'calls'>(initialTab || 'conversa')

  // Edição inline de mensagem pendente e correção de mensagem da IA já enviada
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [correctDialog, setCorrectDialog] = useState<{ open: boolean; msg: Message | null }>({ open: false, msg: null })
  const [correctText, setCorrectText] = useState('')

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

  // Block/unblock
  const [blockMenuOpen, setBlockMenuOpen] = useState(false)
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [blockToast, setBlockToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const blockMenuRef = useRef<HTMLDivElement>(null)

  // Voice clone state
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [audioState, setAudioState] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioText, setAudioText] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolledRef = useRef(false)

  const loadData = useCallback(async () => {
    const [leadRes, msgsRes, actRes, callsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase.from('messages').select('*').eq('lead_id', id).neq('status', 'rejected').order('created_at', { ascending: true }),
      supabase.from('activity_log').select('*').eq('lead_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('calls').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ])
    if (leadRes.data) setLead(leadRes.data)
    if (msgsRes.data) setMessages(msgsRes.data)
    if (actRes.data) setActivities(actRes.data)
    if (callsRes.data) setCalls(callsRes.data)

    supabase
      .from('follow_up_history')
      .select('*, rule:follow_up_rules(trigger_condition, days_after)')
      .eq('lead_id', id)
      .order('sent_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setFollowUpHistory(data || []))

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel(`lead-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${id}` },
        (payload: any) => {
          const msg = payload.new as Message
          // Mensagens rejeitadas nunca entram no chat
          if (msg.status === 'rejected') return
          setMessages(prev => [...prev, msg])
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `lead_id=eq.${id}` },
        (payload: any) => {
          const msg = payload.new as Message
          // Rejeição remota: mensagem some do chat e recalcula o typing indicator
          if (msg.status === 'rejected') {
            setMessages(prev => prev.filter(m => m.id !== msg.id))
            return
          }
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${id}` },
        (payload: any) => { if (payload.new) setLead(payload.new as Lead) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, loadData])

  // Auto-scroll do chat para a última mensagem.
  // - Entrada inicial na aba Conversa: 'auto' (sem animação, vai direto ao fim)
  // - Novas mensagens após já estar na aba: 'smooth' (anima)
  // Reseta o flag ao sair da aba para que a próxima entrada volte a usar 'auto'.
  useEffect(() => {
    if (activeTab !== 'conversa') {
      hasAutoScrolledRef.current = false
      return
    }
    if (messages.length === 0) return
    const behavior: ScrollBehavior = hasAutoScrolledRef.current ? 'smooth' : 'auto'
    // rAF garante que o layout foi aplicado antes do scroll (a bubble acabou de entrar no DOM)
    const rafId = requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior, block: 'end' })
      hasAutoScrolledRef.current = true
    })
    return () => cancelAnimationFrame(rafId)
  }, [messages, activeTab])

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

  // Close block menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (blockMenuRef.current && !blockMenuRef.current.contains(e.target as Node)) setBlockMenuOpen(false)
    }
    if (blockMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [blockMenuOpen])

  function showBlockToast(msg: string, type: 'success' | 'error' = 'success') {
    setBlockToast({ msg, type })
    setTimeout(() => setBlockToast(null), 3000)
  }

  async function handleToggleBlock() {
    if (!lead) return
    const newBlocked = !lead.is_blocked
    setBlockLoading(true)

    const { error } = await supabase
      .from('leads')
      .update({
        is_blocked: newBlocked,
        ...(newBlocked ? { assigned_to: 'lukhas', is_active: false } : { is_active: true }),
      })
      .eq('id', id)

    if (error) {
      setBlockLoading(false)
      setBlockConfirmOpen(false)
      showBlockToast('Erro ao atualizar lead', 'error')
      return
    }

    await supabase.from('activity_log').insert({
      lead_id: id,
      action: 'lead_blocked',
      details: {
        blocked: newBlocked,
        reason: newBlocked ? 'Bloqueado manualmente' : 'Desbloqueado manualmente',
      },
      created_by: profile?.name || 'admin',
    })

    setBlockLoading(false)
    setBlockConfirmOpen(false)
    showBlockToast(newBlocked ? 'Lead bloqueado. IA não responderá mais.' : 'Lead desbloqueado.')
    // Realtime subscription will update lead state automatically
  }

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

  async function handleApproveMessage(msgId: string, editedContent?: string) {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    // Conteúdo final: edição do usuário (se houver) ou original. A RPC detecta a diferença
    // e, se mudou, salva a correção como exemplo pra IA aprender.
    const finalContent = editedContent ?? msg.content
    try {
      // RPC: aprova e (se houvesse edi\u00e7\u00e3o) salvaria como exemplo. Aqui passamos o conte\u00fado original.
      await supabase.rpc('approve_message_with_correction', {
        p_message_id: msgId,
        p_new_content: finalContent,
        p_approved_by: profile?.name || 'admin',
      })
      // Só dispara o envio via Instagram DM se a aprovação no banco foi bem-sucedida
      await sendApprovedMessage(msgId)
    } catch (err) {
      console.error('Erro ao aprovar mensagem:', err)
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: finalContent, status: 'approved' } : m))
    setEditingId(null)
  }

  async function handleRejectMessage(msgId: string) {
    await supabase.from('messages').update({ status: 'rejected' }).eq('id', msgId)
    // Mensagens rejeitadas não aparecem no chat — some imediatamente do state
    setMessages(prev => prev.filter(m => m.id !== msgId))
  }

  async function handleCorrectAIMessage() {
    if (!correctDialog.msg || !correctText.trim()) return
    try {
      // RPC salva a correção como exemplo de conversa e registra no activity_log
      await supabase.rpc('correct_ai_message', {
        p_message_id: correctDialog.msg.id,
        p_correct_response: correctText,
        p_corrected_by: profile?.name || 'admin',
      })
    } catch (err) {
      console.error('Erro ao corrigir mensagem da IA:', err)
    }
    setCorrectDialog({ open: false, msg: null })
    setCorrectText('')
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
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">
      {/* LEFT: Profile Panel */}
      <aside className="w-full lg:w-[340px] flex-shrink-0 bg-white rounded-[16px] sm:rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden lg:max-h-[calc(100vh-120px)] lg:sticky lg:top-0 self-start">
        <div className="p-5 sm:p-6 lg:overflow-y-auto lg:max-h-[calc(100vh-120px)] dropdown-scroll">
          {/* Avatar + Name */}
          <div className="flex items-start gap-4 mb-4">
            <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="xl" className="ring-[3px] ring-[#C8E645]/30 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <h2 className="text-[18px] font-bold text-[#111827] truncate">{displayName}</h2>
                  {hasReadableUsername && <p className="text-[13px] text-[#9CA3AF]">@{lead.instagram_username}</p>}
                </div>
                {/* 3-dots menu */}
                <div className="relative flex-shrink-0" ref={blockMenuRef}>
                  <button
                    onClick={() => setBlockMenuOpen(!blockMenuOpen)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {blockMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-[12px] border border-[#EFEFEF] shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-1 w-[190px] z-50">
                      {lead.is_blocked ? (
                        <button
                          onClick={() => { setBlockMenuOpen(false); handleToggleBlock() }}
                          className="w-full text-left px-3 py-2.5 text-[13px] text-[#059669] hover:bg-[#ECFDF5] flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4" /> Desbloquear lead
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBlockMenuOpen(false); setBlockConfirmOpen(true) }}
                          className="w-full text-left px-3 py-2.5 text-[13px] text-[#EF4444] hover:bg-[#FEF2F2] flex items-center gap-2"
                        >
                          <ShieldOff className="w-4 h-4" /> Bloquear lead
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {lead.follower_count != null && (
                  <span className="text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{lead.follower_count.toLocaleString()} seg.</span>
                )}
                {lead.follows_lukhas && (
                  <span className="text-[11px] font-semibold text-[#059669] bg-[#10B981]/10 px-2 py-0.5 rounded-full">Te segue</span>
                )}
                {lead.is_blocked && (
                  <span className="text-[11px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldOff className="w-3 h-3" /> Bloqueado
                  </span>
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
                    <div className="flex-1">
                      <span className="text-[13px] font-semibold text-[#374151]">
                        {lead.assigned_to === 'lukhas' ? 'Lukhas' : profile?.name || 'Assistente'}
                      </span>
                      <TakeoverTimer leadId={id as string} />
                    </div>
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
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-[16px] sm:rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden min-h-[60vh] lg:max-h-[calc(100vh-120px)] lg:sticky lg:top-0 self-start">
        {/* Blocked banner */}
        {lead.is_blocked && (
          <div className="flex items-center gap-3 px-5 py-3 bg-[#FFFBEB] border-b border-[#F59E0B]/20">
            <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <p className="text-[13px] font-medium text-[#92400E] flex-1">Lead bloqueado — automações desativadas</p>
            <button
              onClick={handleToggleBlock}
              disabled={blockLoading}
              className="text-[12px] font-bold text-[#D97706] hover:text-[#92400E] transition-colors flex-shrink-0 disabled:opacity-50"
            >
              {blockLoading ? 'Aguarde...' : 'Desbloquear'}
            </button>
          </div>
        )}
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

                    const isEditing = editingId === msg.id
                    const canCorrect = isIA && !isPending && msg.status === 'sent'

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
                        <div className={cn('min-w-[120px]', isEditing ? 'w-[min(420px,80%)]' : 'max-w-[65%]')}>
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
                                ? isEditing
                                  ? 'bg-white border-[1.5px] border-[#C8E645] rounded-[16px] rounded-tr-[4px] text-[#374151] shadow-[0_0_0_3px_rgba(200,230,69,0.15)]'
                                  : 'bg-[#FFFBEB] border-[1.5px] border-[#F59E0B]/25 rounded-[16px] rounded-tr-[4px] text-[#374151]'
                                : isIA
                                  ? 'bg-[#F0FFF4] border border-[#C8E645]/20 rounded-[16px] rounded-tr-[4px] text-[#374151]'
                                  : 'bg-[#F7F8F9] border border-[#EFEFEF] rounded-[16px] rounded-tr-[4px] text-[#374151]',
                          )}>
                            {isEditing ? (
                              <textarea
                                autoFocus
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={Math.max(2, editContent.split('\n').length)}
                                className="w-full bg-transparent border-0 text-[14px] text-[#374151] leading-relaxed resize-none focus:ring-0 focus:outline-none p-0 m-0"
                              />
                            ) : (
                              msg.content
                            )}
                          </div>

                          {isPending && isEditing && (
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => handleApproveMessage(msg.id, editContent)} disabled={!editContent.trim()}
                                className={cn(
                                  'flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-full transition-all',
                                  editContent.trim()
                                    ? 'bg-[#C8E645] text-[#111827] shadow-[0_2px_6px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95'
                                    : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed',
                                )}>
                                <Check className="w-3 h-3" /> Salvar e aprovar
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="px-3 py-1.5 text-[#6B7280] text-[11px] font-medium rounded-full hover:bg-[#F3F4F6] active:scale-95 transition-all">
                                Cancelar
                              </button>
                            </div>
                          )}

                          {isPending && !isEditing && (
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => handleApproveMessage(msg.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#C8E645] text-[#111827] text-[11px] font-bold rounded-full shadow-[0_2px_6px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all">
                                <Check className="w-3 h-3" /> Aprovar
                              </button>
                              <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content) }}
                                className="flex items-center gap-1 px-3 py-1.5 border border-[#E5E7EB] text-[#374151] text-[11px] font-semibold rounded-full hover:bg-white hover:border-[#D1D5DB] active:scale-95 transition-all">
                                <Pencil className="w-3 h-3 text-[#6B7280]" /> Editar
                              </button>
                              <button onClick={() => handleRejectMessage(msg.id)}
                                className="flex items-center gap-1 px-3 py-1.5 border border-[#EF4444]/30 text-[#EF4444] text-[11px] font-semibold rounded-full hover:bg-[#FEF2F2] active:scale-95 transition-all">
                                <X className="w-3 h-3" /> Rejeitar
                              </button>
                            </div>
                          )}

                          {canCorrect && (
                            <div className={cn('flex mt-1.5', !isLead && 'justify-end')}>
                              <button
                                onClick={() => { setCorrectDialog({ open: true, msg }); setCorrectText('') }}
                                className="flex items-center gap-1 text-[10px] font-medium text-[#9CA3AF] hover:text-[#7A9E00] transition-colors"
                              >
                                <Bot className="w-2.5 h-2.5" /> Corrigir IA
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Typing indicator — aparece enquanto existir mensagem da IA aguardando aprovação.
                      Some quando a msg é aprovada (status=approved/sent) ou rejeitada (removida do state). */}
                  {(() => {
                    const isAiGenerating = messages.some(
                      m => m.status === 'pending' && m.direction === 'outbound' && m.sent_by === 'ia'
                    )
                    if (!isAiGenerating) return null
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
                  const cfg = getActivityConfig(act.action, act.details)
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

            {/* Histórico de Follow-ups */}
            {followUpHistory.length > 0 && (
              <div className="mt-6 pt-5 border-t border-[#F5F5F5]">
                <div className="flex items-center gap-2 mb-4">
                  <RefreshCw className="w-4 h-4 text-[#0891B2]" />
                  <h4 className="text-[13px] font-bold text-[#111827]">Histórico de Follow-ups</h4>
                  <span className="text-[11px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{followUpHistory.length}</span>
                </div>
                <div className="space-y-2">
                  {followUpHistory.map((fh: any) => {
                    const conditionLabels: Record<string, string> = {
                      sem_resposta: 'Sem resposta',
                      nao_fechou_call: 'Não fechou call',
                      lead_frio_seguidor: 'Lead frio (seguidor)',
                      lead_frio_curtida: 'Lead frio (curtida)',
                      inativo_7d: 'Inativo 7d',
                      inativo_14d: 'Inativo 14d',
                      inativo_30d: 'Inativo 30d',
                    }
                    const conditionLabel = fh.rule?.trigger_condition
                      ? conditionLabels[fh.rule.trigger_condition] || fh.rule.trigger_condition
                      : 'Manual'

                    return (
                      <div key={fh.id} className="flex items-start gap-3 px-3 py-3 rounded-[10px] bg-[#F7F8F9] border border-[#EFEFEF]">
                        <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <RefreshCw className="w-4 h-4 text-[#0891B2]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#374151] leading-relaxed line-clamp-2">
                            {fh.message_sent || 'Tarefa de follow-up criada'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-medium text-[#0891B2] bg-[#06B6D4]/8 px-2 py-0.5 rounded-full">
                              {conditionLabel}
                            </span>
                            {fh.rule?.days_after != null && (
                              <span className="text-[10px] text-[#9CA3AF]">Dia {fh.rule.days_after}</span>
                            )}
                            <span className="text-[#E5E7EB]">·</span>
                            <span className="text-[10px] text-[#C0C7D0]">
                              {formatDistanceToNow(new Date(fh.sent_at), { locale: ptBR, addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
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

      {/* Dialog: Confirmar bloqueio */}
      <Dialog open={blockConfirmOpen} onOpenChange={open => { if (!blockLoading) setBlockConfirmOpen(open) }}>
        <DialogContent className="[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="p-6">
            <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center mb-4">
              <ShieldOff className="w-6 h-6 text-[#EF4444]" />
            </div>
            <h3 className="text-[18px] font-bold text-[#111827] mb-1">Bloquear lead?</h3>
            <p className="text-[14px] text-[#6B7280] mb-5">
              {hasReadableUsername ? `@${lead.instagram_username}` : displayName} não receberá mais mensagens da IA e os follow-ups automáticos serão desativados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBlockConfirmOpen(false)}
                disabled={blockLoading}
                className="flex-1 py-2.5 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleBlock}
                disabled={blockLoading}
                className="flex-1 py-2.5 bg-[#EF4444] rounded-full text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(239,68,68,0.3)] hover:-translate-y-px active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {blockLoading ? 'Bloqueando...' : 'Bloquear'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast block/unblock */}
      {blockToast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[200] px-4 py-3 rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] text-[13px] font-semibold flex items-center gap-2 animate-dropdown-in',
          blockToast.type === 'error'
            ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#EF4444]/20'
            : 'bg-[#F0FFF4] text-[#059669] border border-[#10B981]/20',
        )}>
          {blockToast.type === 'error' ? '✕' : '✓'} {blockToast.msg}
        </div>
      )}

      {/* Dialog: Corrigir IA */}
      <Dialog open={correctDialog.open} onOpenChange={open => { if (!open) { setCorrectDialog({ open: false, msg: null }); setCorrectText('') } }}>
        <DialogContent className={cn(
          '[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden',
          'w-[calc(100vw-32px)] max-w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]',
        )}>
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-[#111827]">Corrigir a IA</h3>
              <p className="text-[13px] text-[#6B7280] mt-1">Ensine como deveria ter respondido</p>
            </div>
            <button onClick={() => { setCorrectDialog({ open: false, msg: null }); setCorrectText('') }} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>

          <div className="px-6 pb-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">IA escreveu</label>
              <div className="px-4 py-3 bg-[#F7F8F9] rounded-[10px] text-[13px] text-[#6B7280] border border-[#EFEFEF]">
                {correctDialog.msg?.content}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Como deveria ser</label>
              <textarea
                autoFocus
                value={correctText}
                onChange={e => setCorrectText(e.target.value)}
                placeholder="Escreva como você responderia..."
                className={cn(
                  'w-full bg-white border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151]',
                  'focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)]',
                  'transition-all min-h-[100px] resize-none placeholder-[#C0C7D0]',
                )}
              />
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-[#C8E645]/8 rounded-[10px]">
              <Info className="w-4 h-4 text-[#7A9E00] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#5A6B00] leading-relaxed">
                Essa correção será salva como exemplo e a IA vai aprender com ela.
              </p>
            </div>
          </div>

          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3">
            <button
              onClick={() => { setCorrectDialog({ open: false, msg: null }); setCorrectText('') }}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleCorrectAIMessage}
              disabled={!correctText.trim()}
              className={cn(
                'flex-1 py-3 rounded-full text-[14px] font-bold transition-all',
                correctText.trim()
                  ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]'
                  : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed',
              )}
            >
              Salvar correção
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
