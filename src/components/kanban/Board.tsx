'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Column } from './Column'
import { LeadCard } from './LeadCard'
import type { Lead, LeadStage } from '@/lib/types'

const COLUMNS: { id: LeadStage; title: string }[] = [
  { id: 'novo', title: 'Novo' },
  { id: 'rapport', title: 'Rapport' },
  { id: 'social_selling', title: 'Social Selling' },
  { id: 'spin', title: 'SPIN' },
  { id: 'call_agendada', title: 'Call Agendada' },
  { id: 'fechado', title: 'Fechou' },
  { id: 'perdido', title: 'Não Fechou' },
  { id: 'follow_up', title: 'Follow-up' },
]

interface BoardProps {
  leads: Lead[]
  onStageChange: (leadId: string, newStage: LeadStage) => void
}

export function Board({ leads, onStageChange }: BoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const activeLead = leads.find(l => l.id === activeId)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    // over.id pode ser uma coluna ou outro card
    let newStage: LeadStage | undefined

    // Se caiu sobre uma coluna
    const col = COLUMNS.find(c => c.id === over.id)
    if (col) {
      newStage = col.id
    } else {
      // Caiu sobre outro card — pegar a stage do card de destino
      const targetLead = leads.find(l => l.id === over.id)
      if (targetLead) newStage = targetLead.stage
    }

    if (newStage && newStage !== lead.stage) {
      onStageChange(leadId, newStage)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
        {COLUMNS.map(col => (
          <Column
            key={col.id}
            id={col.id}
            title={col.title}
            leads={leads.filter(l => l.stage === col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="shadow-lg">
            <LeadCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
