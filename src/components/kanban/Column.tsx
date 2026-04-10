'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils'
import type { Lead } from '@/lib/types'

interface ColumnProps {
  id: string
  title: string
  leads: Lead[]
}

export function Column({ id, title, leads }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between px-2 pb-3">
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 p-2 rounded-lg min-h-[200px] transition-colors duration-150",
          isOver ? 'bg-emerald-400/[0.06]' : 'bg-[#0a0c18]'
        )}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
