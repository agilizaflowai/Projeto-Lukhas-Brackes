'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, getLeadDisplayName, sendApprovedMessage } from '@/lib/utils'
import { Check, X, Pencil, Bot, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { Message, Lead } from '@/lib/types'

interface PendingMessage extends Message {
  lead?: Lead
  lastInbound?: string
}

function shortTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { locale: ptBR, addSuffix: false })
    .replace('cerca de ', '')
    .replace('menos de um minuto', 'agora')
}

export default function MessagesPage() {
  const supabase = createClient()
  const { profile } = useProfile()
  const [items, setItems] = useState<PendingMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState<string | null>(null)

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Correct AI
  const [correctDialog, setCorrectDialog] = useState<{ open: boolean; msg: PendingMessage | null }>({ open: false, msg: null })
  const [correctText, setCorrectText] = useState('')

  const load = useCallback(async () => {
    const { data: msgs }: { data: any[] | null } = await supabase
      .from('messages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!msgs || msgs.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const leadIds = [...new Set(msgs.map(m => m.lead_id))]
    const [{ data: leads }, { data: inboundMsgs }] = await Promise.all([
      supabase.from('leads').select('*').in('id', leadIds),
      supabase.from('messages').select('lead_id, content, created_at')
        .in('lead_id', leadIds)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false }),
    ])

    // Build a map of lead_id -> most recent inbound content
    const lastInboundMap = new Map<string, string>()
    for (const m of inboundMsgs || []) {
      if (!lastInboundMap.has(m.lead_id)) {
        lastInboundMap.set(m.lead_id, m.content)
      }
    }

    const enriched: PendingMessage[] = msgs.map(msg => ({
      ...msg,
      lead: leads?.find(l => l.id === msg.lead_id) || undefined,
      lastInbound: lastInboundMap.get(msg.lead_id) || undefined,
    }))

    setItems(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('pending-msgs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function approve(msgId: string, content?: string) {
    setDismissing(msgId)
    await new Promise(r => setTimeout(r, 300))
    const msg = items.find(m => m.id === msgId)
    // Conte\u00fado final: edi\u00e7\u00e3o do usu\u00e1rio ou conte\u00fado original (RPC detecta se mudou)
    const finalContent = content ?? msg?.content ?? ''
    try {
      // RPC aprova a mensagem E, se houve edi\u00e7\u00e3o, salva como exemplo pra IA aprender
      // Tamb\u00e9m registra no activity_log internamente
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
    setItems(prev => prev.filter(m => m.id !== msgId))
    setEditingId(null)
    setDismissing(null)
  }

  async function reject(msgId: string) {
    setDismissing(msgId)
    await new Promise(r => setTimeout(r, 300))
    const msg = items.find(m => m.id === msgId)
    await supabase.from('messages').update({ status: 'rejected' }).eq('id', msgId)
    if (msg?.lead_id) {
      await supabase.from('activity_log').insert({
        lead_id: msg.lead_id,
        action: 'message_rejected',
        details: { lead_name: msg.lead?.name || msg.lead?.instagram_username },
        created_by: profile?.name || 'user',
      })
    }
    setItems(prev => prev.filter(m => m.id !== msgId))
    setDismissing(null)
  }

  async function saveCorrection() {
    if (!correctDialog.msg || !correctText.trim()) return
    try {
      // RPC salva a corre\u00e7\u00e3o como exemplo de conversa e registra no activity_log
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

  const hasReadableUsername = (u?: string) => u && !u.startsWith('ig_') && !/^\d{10,}$/.test(u)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Mensagens Pendentes</h2>
          <p className="text-[#414844] opacity-80 mt-1">Aprove ou edite as mensagens geradas pela IA antes do envio</p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center bg-white rounded-[14px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden self-start md:self-auto">
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <div>
                <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-[0.06em]">Pendentes</p>
                <p className="text-[18px] font-bold text-[#111827] tabular-nums">{items.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 skeleton-shimmer rounded-[16px]" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C8E645]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-[#C8E645]" />
          </div>
          <h3 className="text-[16px] font-bold text-[#111827] mb-1">Tudo em dia!</h3>
          <p className="text-[13px] text-[#9CA3AF]">Nenhuma mensagem aguardando aprovação</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(msg => {
            const lead = msg.lead
            const readable = hasReadableUsername(lead?.instagram_username)
            const displayName = lead ? getLeadDisplayName(lead) : 'Lead'
            const initials = (lead?.name || lead?.instagram_username || '?').slice(0, 2).toUpperCase()

            return (
              <div
                key={msg.id}
                className={cn(
                  'bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300',
                  dismissing === msg.id && 'opacity-0 translate-x-8 scale-[0.98]',
                )}
              >
                {/* Header */}
                <div className="flex items-center gap-4 px-5 pt-5 pb-3">
                  <Link href={`/leads/${msg.lead_id}`} className="flex-shrink-0">
                    <LeadAvatar name={lead?.name || null} username={lead?.instagram_username} photoUrl={lead?.profile_pic_url || null} size="lg" className="hover:ring-2 hover:ring-[#C8E645]/30 transition-all" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/leads/${msg.lead_id}`} className="text-[14px] font-bold text-[#111827] hover:underline truncate block">
                      {displayName}
                    </Link>
                    {lead?.name && readable && (
                      <span className="text-[12px] text-[#9CA3AF] -mt-0.5 block">@{lead.instagram_username}</span>
                    )}
                  </div>
                  {(() => {
                    const minsPending = Math.floor((Date.now() - new Date(msg.created_at).getTime()) / 60000)
                    return (
                      <span className={cn(
                        'flex items-center gap-1 text-[12px] flex-shrink-0',
                        minsPending > 120 ? 'text-[#EF4444] font-semibold' :
                        minsPending > 60 ? 'text-[#D97706] font-semibold' :
                        'text-[#9CA3AF]'
                      )}>
                        {minsPending > 60 && <AlertTriangle className="w-3 h-3" />}
                        {shortTime(msg.created_at)}
                      </span>
                    )
                  })()}
                </div>

                {/* Last inbound */}
                {msg.lastInbound && (
                  <div className="mx-5 mb-3 px-4 py-3 bg-[#F7F8F9] rounded-[10px] border border-[#EFEFEF]">
                    <p className="text-[11px] font-medium text-[#9CA3AF] mb-1">Última mensagem do lead</p>
                    <p className="text-[13px] text-[#374151] leading-relaxed">{msg.lastInbound}</p>
                  </div>
                )}

                {/* AI suggestion or editor */}
                {editingId === msg.id ? (
                  <div className="mx-5 mb-4">
                    <textarea
                      autoFocus
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className={cn(
                        'w-full bg-white border-[1.5px] border-[#C8E645] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] leading-relaxed',
                        'focus:ring-0 focus:outline-none focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all min-h-[80px] resize-none',
                      )}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => approve(msg.id, editContent)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#C8E645] text-[#111827] text-[12px] font-bold rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.3)] active:scale-95 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Salvar e aprovar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-[#6B7280] text-[12px] font-medium rounded-full hover:bg-[#F3F4F6] transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mx-5 mb-4 px-4 py-3 bg-[#FBFFF7] rounded-[10px] border border-[#C8E645]/12">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-4 h-4 rounded bg-[#C8E645]/20 flex items-center justify-center">
                        <Bot className="w-2.5 h-2.5 text-[#7A9E00]" />
                      </div>
                      <span className="text-[10px] font-bold text-[#7A9E00] uppercase tracking-[0.04em]">Sugestão da IA</span>
                    </div>
                    <p className="text-[14px] text-[#374151] leading-relaxed">{msg.content}</p>
                  </div>
                )}

                {/* Actions */}
                {editingId !== msg.id && (
                  <div className="flex items-center gap-2 px-5 py-3 bg-[#FAFBFC] border-t border-[#F3F4F6]">
                    <button
                      onClick={() => approve(msg.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#C8E645] text-[#111827] text-[12px] font-bold rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() => { setEditingId(msg.id); setEditContent(msg.content) }}
                      className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E7EB] text-[#374151] text-[12px] font-semibold rounded-full hover:bg-[#F7F8F9] hover:border-[#D1D5DB] active:scale-95 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#6B7280]" /> Editar
                    </button>
                    <button
                      onClick={() => reject(msg.id)}
                      className="flex items-center gap-1.5 px-4 py-2 text-[#EF4444] text-[12px] font-semibold rounded-full hover:bg-[#FEF2F2] active:scale-95 transition-all"
                    >
                      <X className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                    <button
                      onClick={() => { setCorrectDialog({ open: true, msg }); setCorrectText('') }}
                      className="flex items-center gap-1.5 ml-auto px-3 py-2 border border-[#E5E7EB] text-[#6B7280] text-[12px] font-medium rounded-full hover:bg-[#F7F8F9] hover:border-[#D1D5DB] transition-all"
                    >
                      <Bot className="w-3.5 h-3.5" /> Corrigir IA
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Correct AI Dialog */}
      <Dialog open={correctDialog.open} onOpenChange={open => { if (!open) setCorrectDialog({ open: false, msg: null }) }}>
        <DialogContent className={cn(
          '[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden',
          'w-[calc(100vw-32px)] max-w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]',
        )}>
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-[#111827]">Corrigir a IA</h3>
              <p className="text-[13px] text-[#6B7280] mt-1">Ensine como deveria ter respondido</p>
            </div>
            <button onClick={() => setCorrectDialog({ open: false, msg: null })} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
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
              onClick={() => setCorrectDialog({ open: false, msg: null })}
              className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={saveCorrection}
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
