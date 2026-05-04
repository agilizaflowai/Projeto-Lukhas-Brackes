'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'
import type { Lead } from '@/lib/types'

const VISIBLE_LIMIT = 15

interface ColumnProps {
  id: string
  title: string
  color: string
  leads: Lead[]
  onScheduleCall?: (leadId: string) => void
}

export function Column({ id, title, color, leads, onScheduleCall }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [showAll, setShowAll] = useState(false)

  const visibleLeads = showAll ? leads : leads.slice(0, VISIBLE_LIMIT)
  const hasMore = leads.length > VISIBLE_LIMIT && !showAll

  return (
    <div
      id={`column-${id}`}
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[260px] sm:min-w-[272px] max-w-[260px] sm:max-w-[272px] h-full flex-shrink-0 transition-all duration-200',
      )}
    >
      {/* Column header */}
      <div className="sticky top-0 z-10 bg-[#f8faf7] pb-2">
        <div className="flex items-center justify-center gap-2 px-1 py-2">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-[13px] font-bold text-[#111827] uppercase tracking-[0.04em]">
            {title}
          </h3>
          <span className="text-[12px] font-semibold text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full min-w-[24px] text-center">
            {leads.length}
          </span>
        </div>
        <div className="h-[2px] rounded-full" style={{ backgroundColor: color }} />
      </div>

      {/* Cards area */}
      <div
        className={cn(
          'flex-1 rounded-[16px] p-[10px] pt-2 min-h-[200px] space-y-[10px] overflow-y-auto kanban-scroll',
          isOver
            ? 'bg-[rgba(200,230,69,0.06)] border-2 border-dashed border-[rgba(200,230,69,0.30)]'
            : 'bg-[#F3F4F6]'
        )}
      >
        <SortableContext items={visibleLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {visibleLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} stageColor={color} onScheduleCall={onScheduleCall} />
          ))}
        </SortableContext>

        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-2.5 text-center text-[12px] font-semibold text-[#6B7280] bg-white border border-[#EFEFEF] rounded-[10px] hover:bg-[#F7F8F9] transition-colors"
          >
            Ver mais {leads.length - VISIBLE_LIMIT} leads
          </button>
        )}

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
            <Inbox className="w-6 h-6 text-[#D1D5DB] mb-2" />
            <span className="text-[11px] text-[#9CA3AF]">Nenhum lead nesta etapa</span>
          </div>
        )}
      </div>
    </div>
  )
}
