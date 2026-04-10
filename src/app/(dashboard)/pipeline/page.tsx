'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Board } from '@/components/kanban/Board'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import type { Lead, LeadStage } from '@/lib/types'

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')

  // Dialog states
  const [callDialog, setCallDialog] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null })
  const [callDate, setCallDate] = useState('')
  const [followUpDialog, setFollowUpDialog] = useState<{ open: boolean; leadId: string | null }>({ open: false, leadId: null })

  const supabase = createClient()

  const loadLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('is_active', true)
      .neq('stage', 'lead_frio')
      .order('stage_changed_at', { ascending: false, nullsFirst: false })

    if (data) setLeads(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLeads()

    const channel = supabase
      .channel('pipeline-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadLeads())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadLeads])

  async function handleStageChange(leadId: string, newStage: LeadStage) {
    // Dialogs especiais
    if (newStage === 'call_agendada') {
      setCallDialog({ open: true, leadId })
      return
    }

    if (newStage === 'perdido') {
      setFollowUpDialog({ open: true, leadId })
      return
    }

    // Update normal
    await updateLeadStage(leadId, newStage)
  }

  async function updateLeadStage(leadId: string, newStage: LeadStage) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage, stage_changed_at: new Date().toISOString() } : l))

    await supabase.from('leads').update({ stage: newStage, stage_changed_at: new Date().toISOString() }).eq('id', leadId)
    await supabase.from('activity_log').insert({
      lead_id: leadId,
      action: 'stage_changed',
      details: { new_stage: newStage },
      created_by: 'user',
    })
  }

  async function handleScheduleCall() {
    if (!callDialog.leadId || !callDate) return
    await updateLeadStage(callDialog.leadId, 'call_agendada')
    await supabase.from('calls').insert({ lead_id: callDialog.leadId, scheduled_at: new Date(callDate).toISOString() })
    setCallDialog({ open: false, leadId: null })
    setCallDate('')
  }

  async function handleFollowUp(sendToFollowUp: boolean) {
    if (!followUpDialog.leadId) return
    if (sendToFollowUp) {
      const nextFollowUp = new Date()
      nextFollowUp.setDate(nextFollowUp.getDate() + 3)
      await supabase.from('leads').update({
        stage: 'follow_up',
        stage_changed_at: new Date().toISOString(),
        next_follow_up_at: nextFollowUp.toISOString(),
      }).eq('id', followUpDialog.leadId)
      setLeads(prev => prev.map(l => l.id === followUpDialog.leadId ? { ...l, stage: 'follow_up' as LeadStage, stage_changed_at: new Date().toISOString() } : l))
    } else {
      await updateLeadStage(followUpDialog.leadId, 'perdido')
    }
    setFollowUpDialog({ open: false, leadId: null })
  }

  // Filtros
  const filtered = leads.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      if (!l.name?.toLowerCase().includes(q) && !l.instagram_username.toLowerCase().includes(q)) return false
    }
    if (filterSource && l.source !== filterSource) return false
    if (filterAssigned && l.assigned_to !== filterAssigned) return false
    return true
  })

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>Pipeline</h1>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer w-72 h-96 shrink-0" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>Pipeline</h1>
      <p className="text-muted-foreground mb-4">Arraste leads entre as etapas do funil</p>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar lead..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="">Todas origens</option>
          <option value="comentario">Comentário</option>
          <option value="story_reply">Story Reply</option>
          <option value="dm_direta">DM Direta</option>
          <option value="seguidor">Seguidor</option>
          <option value="curtida">Curtida</option>
          <option value="indicacao">Indicação</option>
        </Select>
        <Select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
          <option value="">Todos responsáveis</option>
          <option value="ia">IA</option>
          <option value="lukhas">Lukhas</option>
          <option value="assistente">Assistente</option>
        </Select>
      </div>

      <Board leads={filtered} onStageChange={handleStageChange} />

      {/* Dialog: Agendar Call */}
      <Dialog open={callDialog.open} onOpenChange={open => { if (!open) setCallDialog({ open: false, leadId: null }) }}>
        <DialogContent onClose={() => setCallDialog({ open: false, leadId: null })}>
          <DialogHeader>
            <DialogTitle>Agendar Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Data e horário</label>
            <Input type="datetime-local" value={callDate} onChange={e => setCallDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialog({ open: false, leadId: null })}>Cancelar</Button>
            <Button onClick={handleScheduleCall} disabled={!callDate}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Follow-up */}
      <Dialog open={followUpDialog.open} onOpenChange={open => { if (!open) setFollowUpDialog({ open: false, leadId: null }) }}>
        <DialogContent onClose={() => setFollowUpDialog({ open: false, leadId: null })}>
          <DialogHeader>
            <DialogTitle>Lead não fechou</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja enviar este lead para o follow-up automático?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleFollowUp(false)}>Não, marcar como Perdido</Button>
            <Button onClick={() => handleFollowUp(true)}>Sim, enviar pra Follow-up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
