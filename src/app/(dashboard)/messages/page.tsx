'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, X, Pencil, Bot, ExternalLink } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import type { Message, Lead } from '@/lib/types'

interface PendingMessage extends Message {
  lead?: Lead
  lastInbound?: string
}

export default function MessagesPage() {
  const supabase = createClient()
  const { profile } = useProfile()
  const [items, setItems] = useState<PendingMessage[]>([])
  const [loading, setLoading] = useState(true)

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

    // Get leads and last inbound messages
    const leadIds = [...new Set(msgs.map(m => m.lead_id))]
    const { data: leads } = await supabase.from('leads').select('*').in('id', leadIds)

    // Get last inbound per lead
    const enriched: PendingMessage[] = []
    for (const msg of msgs) {
      const lead = leads?.find(l => l.id === msg.lead_id)
      const { data: lastInboundData } = await supabase
        .from('messages')
        .select('content')
        .eq('lead_id', msg.lead_id)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(1)

      enriched.push({
        ...msg,
        lead: lead || undefined,
        lastInbound: lastInboundData?.[0]?.content || undefined,
      })
    }

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
    const update: Record<string, unknown> = { status: 'approved', approved_by: profile?.name || 'user', approved: true }
    if (content) update.content = content
    await supabase.from('messages').update(update).eq('id', msgId)
    setItems(prev => prev.filter(m => m.id !== msgId))
    setEditingId(null)
  }

  async function reject(msgId: string) {
    await supabase.from('messages').update({ status: 'rejected' }).eq('id', msgId)
    setItems(prev => prev.filter(m => m.id !== msgId))
  }

  async function saveCorrection() {
    if (!correctDialog.msg || !correctText.trim()) return
    await supabase.from('ai_config').insert({
      config_type: 'example_conversation',
      config_key: `correction_${Date.now()}`,
      config_value: `IA escreveu: "${correctDialog.msg.content}"\nDeveria ser: "${correctText}"`,
    })
    setCorrectDialog({ open: false, msg: null })
    setCorrectText('')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>Mensagens Pendentes</h1>
      <p className="text-muted-foreground mb-4">Aprove ou edite as mensagens geradas pela IA antes do envio</p>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-32" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Bot} title="Nenhuma mensagem pendente" description="Todas as mensagens da IA foram revisadas. Bom trabalho!" />
      ) : (
        <div className="space-y-3">
          {items.map(msg => (
            <Card key={msg.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Lead info */}
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {msg.lead?.profile_pic_url ? (
                      <img src={msg.lead.profile_pic_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {(msg.lead?.name || msg.lead?.instagram_username || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/leads/${msg.lead_id}`} className="font-medium text-sm hover:underline">
                        {msg.lead?.name || `@${msg.lead?.instagram_username || '...'}`}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </div>

                    {/* Last inbound */}
                    {msg.lastInbound && (
                      <div className="mb-2 p-2 rounded-md bg-muted text-sm">
                        <span className="text-xs text-muted-foreground block mb-0.5">Última msg do lead:</span>
                        {msg.lastInbound}
                      </div>
                    )}

                    {/* AI message */}
                    {editingId === msg.id ? (
                      <div className="space-y-2">
                        <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approve(msg.id, editContent)}>
                            <Check className="w-3.5 h-3.5" /> Aprovar editado
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-400/[0.05] border border-emerald-400/10 text-sm">
                        <span className="text-[10px] font-medium text-primary uppercase block mb-1">Sugestão da IA</span>
                        {msg.content}
                      </div>
                    )}

                    {/* Actions */}
                    {editingId !== msg.id && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button size="sm" onClick={() => approve(msg.id)}>
                          <Check className="w-3.5 h-3.5" /> Aprovar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(msg.id); setEditContent(msg.content) }}>
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject(msg.id)} className="text-destructive">
                          <X className="w-3.5 h-3.5" /> Rejeitar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setCorrectDialog({ open: true, msg }); setCorrectText('') }}>
                          <Bot className="w-3.5 h-3.5" /> Corrigir IA
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Correct AI Dialog */}
      <Dialog open={correctDialog.open} onOpenChange={open => { if (!open) setCorrectDialog({ open: false, msg: null }) }}>
        <DialogContent onClose={() => setCorrectDialog({ open: false, msg: null })}>
          <DialogHeader><DialogTitle>Corrigir IA</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-muted text-sm">
              <span className="text-xs text-muted-foreground block mb-1">A IA escreveu:</span>
              {correctDialog.msg?.content}
            </div>
            <Textarea value={correctText} onChange={e => setCorrectText(e.target.value)} placeholder="Como deveria ser a mensagem?" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectDialog({ open: false, msg: null })}>Cancelar</Button>
            <Button onClick={saveCorrection} disabled={!correctText.trim()}>Salvar correção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
