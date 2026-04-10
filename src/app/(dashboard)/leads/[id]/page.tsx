'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  ExternalLink, UserCheck, Bot, Send, Calendar, StickyNote,
  RefreshCw, ArrowRight, MessageSquare, Clock, Phone, User,
  X,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lead, Message, ActivityLog, Call, LeadStage } from '@/lib/types'

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: 'novo', label: 'Novo' }, { value: 'lead_frio', label: 'Lead Frio' },
  { value: 'rapport', label: 'Rapport' }, { value: 'social_selling', label: 'Social Selling' },
  { value: 'spin', label: 'SPIN' }, { value: 'call_agendada', label: 'Call Agendada' },
  { value: 'fechado', label: 'Fechado' }, { value: 'perdido', label: 'Perdido' },
  { value: 'follow_up', label: 'Follow-up' },
]

const ACTIVITY_ICONS: Record<string, typeof ArrowRight> = {
  stage_changed: ArrowRight, message_sent: MessageSquare, message_approved: MessageSquare,
  call_scheduled: Calendar, follow_up_sent: RefreshCw, human_takeover: User, note_added: StickyNote,
}

const ACTIVITY_BG: Record<string, string> = {
  stage_changed: 'bg-emerald-500/15',
  message_sent: 'bg-blue-500/15',
  message_approved: 'bg-blue-500/15',
  call_scheduled: 'bg-amber-500/15',
  human_takeover: 'bg-pink-500/15',
  note_added: 'bg-slate-500/15',
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

  // Dialogs
  const [callDialog, setCallDialog] = useState(false)
  const [callDate, setCallDate] = useState('')
  const [noteDialog, setNoteDialog] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [followUpDialog, setFollowUpDialog] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')

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

    // Realtime messages
    const channel = supabase
      .channel(`lead-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${id}` },
        (payload) => { setMessages(prev => [...prev, payload.new as Message]) }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${id}` },
        (payload) => { if (payload.new) setLead(payload.new as Lead) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, loadData])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function updateField(field: string, value: unknown) {
    if (!lead) return
    setLead({ ...lead, [field]: value } as Lead)
    await supabase.from('leads').update({ [field]: value }).eq('id', id)
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !lead) return
    setSending(true)
    await supabase.from('messages').insert({
      lead_id: id,
      direction: 'outbound',
      channel: 'instagram',
      content: newMessage,
      content_type: 'text',
      sent_by: profile?.role === 'admin' ? 'lukhas' : 'assistente',
      status: 'sent',
      approved: true,
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
    if (!callDate) return
    await supabase.from('calls').insert({ lead_id: id, scheduled_at: new Date(callDate).toISOString() })
    await supabase.from('activity_log').insert({ lead_id: id, action: 'call_scheduled', details: { scheduled_at: callDate }, created_by: profile?.name })
    setCallDialog(false)
    setCallDate('')
    loadData()
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    await supabase.from('activity_log').insert({ lead_id: id, action: 'note_added', details: { note: noteText }, created_by: profile?.name })
    setNoteDialog(false)
    setNoteText('')
    loadData()
  }

  async function handleSetFollowUp() {
    if (!followUpDate) return
    await updateField('next_follow_up_at', new Date(followUpDate).toISOString())
    setFollowUpDialog(false)
    setFollowUpDate('')
  }

  function handleAddTag() {
    if (!tagInput.trim() || !lead) return
    const newTags = [...lead.tags, tagInput.trim()]
    updateField('tags', newTags)
    setTagInput('')
  }

  function handleRemoveTag(tag: string) {
    if (!lead) return
    updateField('tags', lead.tags.filter(t => t !== tag))
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="skeleton-shimmer h-10 w-64" /><Skeleton className="skeleton-shimmer h-96" /></div>
  }

  if (!lead) {
    return <p className="text-muted-foreground">Lead não encontrado.</p>
  }

  const pendingMsgs = messages.filter(m => m.status === 'pending')

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* LEFT: Perfil */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            {/* Avatar + Nome */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted ring-2 ring-[#1a1f3e] flex items-center justify-center overflow-hidden shrink-0">
                {lead.profile_pic_url ? (
                  <img src={lead.profile_pic_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">{(lead.name || lead.instagram_username)[0].toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{lead.name || `@${lead.instagram_username}`}</p>
                <p className="text-sm text-muted-foreground">@{lead.instagram_username}</p>
              </div>
            </div>

            {/* Bio */}
            {lead.bio && <p className="text-sm text-muted-foreground">{lead.bio}</p>}
            {lead.bio_link && (
              <a href={lead.bio_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{lead.bio_link}</a>
            )}

            {/* Info badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              {lead.follower_count != null && <Badge variant="secondary">{lead.follower_count.toLocaleString()} seguidores</Badge>}
              <Badge variant={lead.follows_lukhas ? 'default' : 'outline'}>{lead.follows_lukhas ? 'Te segue' : 'Não te segue'}</Badge>
            </div>

            <a href={`https://instagram.com/${lead.instagram_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline transition-colors duration-150">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir no Instagram
            </a>

            <hr />

            {/* Stage */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Etapa</label>
              <Select value={lead.stage} onChange={e => updateField('stage', e.target.value)}>
                {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>

            {/* Assigned */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <Select value={lead.assigned_to} onChange={e => updateField('assigned_to', e.target.value)}>
                <option value="ia">IA</option>
                <option value="lukhas">Lukhas</option>
                <option value="assistente">Assistente</option>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateField('assigned_to', profile?.role === 'admin' ? 'lukhas' : 'assistente')}>
                <UserCheck className="w-3.5 h-3.5" /> Assumir
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateField('assigned_to', 'ia')}>
                <Bot className="w-3.5 h-3.5" /> Devolver IA
              </Button>
            </div>

            <hr />

            {/* Classificação */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Gênero</label>
                <Select value={lead.gender || ''} onChange={e => updateField('gender', e.target.value || null)}>
                  <option value="">—</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="outro">Outro</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nível Fitness</label>
                <Select value={lead.fitness_level || ''} onChange={e => updateField('fitness_level', e.target.value || null)}>
                  <option value="">—</option><option value="sedentario">Sedentário</option><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Objetivo</label>
                <Select value={lead.goal || ''} onChange={e => updateField('goal', e.target.value || null)}>
                  <option value="">—</option><option value="emagrecer">Emagrecer</option><option value="hipertrofia">Hipertrofia</option><option value="saude">Saúde</option><option value="performance">Performance</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contexto</label>
                <Input value={lead.life_context || ''} placeholder="mãe, estudante, etc" onChange={e => updateField('life_context', e.target.value || null)} />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {lead.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive cursor-pointer"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Nova tag" className="h-8 text-xs"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }} />
                  <Button size="sm" variant="outline" onClick={handleAddTag} className="h-8 text-xs px-2">+</Button>
                </div>
              </div>
            </div>

            <hr />

            {/* Ações */}
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start text-xs transition-all duration-150" onClick={() => setCallDialog(true)}>
                <Calendar className="w-3.5 h-3.5" /> Agendar Call
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start text-xs transition-all duration-150" onClick={() => setNoteDialog(true)}>
                <StickyNote className="w-3.5 h-3.5" /> Adicionar Nota
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start text-xs transition-all duration-150" onClick={() => setFollowUpDialog(true)}>
                <RefreshCw className="w-3.5 h-3.5" /> Marcar Follow-up
              </Button>
            </div>

            {/* Meta */}
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p>Origem: <span className="capitalize">{lead.source || '—'}</span></p>
              <p>Entrada: {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: Tabs */}
      <div className="flex-1 min-w-0">
        <Tabs defaultValue="conversa">
          <TabsList>
            <TabsTrigger value="conversa">Conversa {pendingMsgs.length > 0 && `(${pendingMsgs.length})`}</TabsTrigger>
            <TabsTrigger value="atividade">Atividade</TabsTrigger>
            <TabsTrigger value="calls">Calls ({calls.length})</TabsTrigger>
          </TabsList>

          {/* TAB CONVERSA */}
          <TabsContent value="conversa">
            <Card>
              <CardContent className="p-0">
                <div className="h-[calc(100vh-18rem)] flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-12">Nenhuma mensagem ainda</p>
                    )}
                    {messages.map(msg => {
                      const isOutbound = msg.direction === 'outbound'
                      const isPending = msg.status === 'pending'
                      const sentByColor = msg.sent_by && /ia/i.test(msg.sent_by) ? 'text-emerald-400' : msg.sent_by && /lukhas/i.test(msg.sent_by) ? 'text-pink-400' : 'text-muted-foreground'
                      return (
                        <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] px-4 py-2.5 text-sm space-y-1 ${
                            isPending ? 'rounded-2xl border-2 border-amber-400/60 bg-amber-400/[0.06] text-foreground' :
                            isOutbound ? 'rounded-2xl rounded-br-sm bg-emerald-400/[0.08] text-foreground' : 'rounded-2xl rounded-bl-sm bg-[#151937]'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <div className={`flex items-center gap-2 text-[10px] text-muted-foreground`}>
                              {msg.sent_by !== 'lead' && (
                                <span className={`font-medium uppercase ${sentByColor}`}>{msg.sent_by}</span>
                              )}
                              <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                            </div>
                            {/* Pending actions */}
                            {isPending && (
                              <div className="flex gap-2 pt-1">
                                <Button size="sm" className="h-7 text-xs" onClick={() => handleApproveMessage(msg.id)}>Aprovar</Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRejectMessage(msg.id)}>Rejeitar</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t p-3 flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Escrever mensagem..."
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                      disabled={sending}
                    />
                    <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB ATIVIDADE */}
          <TabsContent value="atividade">
            <Card>
              <CardContent className="p-5">
                {activities.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhuma atividade registrada</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map(act => {
                      const Icon = ACTIVITY_ICONS[act.action] || Clock
                      const details = act.details as Record<string, unknown> | null
                      let description = act.action.replace(/_/g, ' ')
                      if (act.action === 'stage_changed' && details?.new_stage) description = `Movido para ${details.new_stage}`
                      if (act.action === 'note_added' && details?.note) description = `Nota: ${details.note}`
                      if (act.action === 'call_scheduled') description = 'Call agendada'

                      return (
                        <div key={act.id} className="flex gap-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${ACTIVITY_BG[act.action] || 'bg-muted'}`}>
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{description}</p>
                            <p className="text-xs text-muted-foreground">
                              {act.created_by && `${act.created_by} · `}
                              {formatDistanceToNow(new Date(act.created_at), { locale: ptBR, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CALLS */}
          <TabsContent value="calls">
            <Card>
              <CardContent className="p-5">
                {calls.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhuma call registrada</p>
                ) : (
                  <div className="space-y-3">
                    {calls.map(call => (
                      <a key={call.id} href={`/calls/${call.id}`} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {call.scheduled_at ? format(new Date(call.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Sem data'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {call.duration_minutes ? `${call.duration_minutes} min` : 'Duração não registrada'}
                            {call.ai_analysis?.score != null && ` · Score: ${call.ai_analysis.score}/10`}
                          </p>
                        </div>
                        {call.result && (
                          <Badge variant={call.result === 'fechou' ? 'default' : 'secondary'} className="capitalize shrink-0">
                            {call.result.replace('_', ' ')}
                          </Badge>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOGS */}
      <Dialog open={callDialog} onOpenChange={setCallDialog}>
        <DialogContent onClose={() => setCallDialog(false)}>
          <DialogHeader><DialogTitle>Agendar Call</DialogTitle></DialogHeader>
          <Input type="datetime-local" value={callDate} onChange={e => setCallDate(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialog(false)}>Cancelar</Button>
            <Button onClick={handleScheduleCall} disabled={!callDate}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent onClose={() => setNoteDialog(false)}>
          <DialogHeader><DialogTitle>Adicionar Nota</DialogTitle></DialogHeader>
          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escreva uma nota..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddNote} disabled={!noteText.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
        <DialogContent onClose={() => setFollowUpDialog(false)}>
          <DialogHeader><DialogTitle>Marcar Follow-up</DialogTitle></DialogHeader>
          <Input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialog(false)}>Cancelar</Button>
            <Button onClick={handleSetFollowUp} disabled={!followUpDate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
