'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lead } from '@/lib/types'
import { STAGE_COLORS } from '@/lib/stage-colors'
import Link from 'next/link'

const STAGE_BORDER_CSS: Record<string, string> = {
  novo: '#60a5fa', lead_frio: '#94a3b8', rapport: '#c084fc', social_selling: '#818cf8',
  spin: '#fbbf24', call_agendada: '#facc15', fechado: '#34d399', perdido: '#fb7185', follow_up: '#22d3ee',
}

interface LeadCardProps {
  lead: Lead
}

export function LeadCard({ lead }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeft: '3px solid',
    borderLeftColor: STAGE_BORDER_CSS[lead.stage] ?? '#a1a1aa',
  }

  const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date()
  const stageTime = lead.stage_changed_at
    ? formatDistanceToNow(new Date(lead.stage_changed_at), { locale: ptBR, addSuffix: false })
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-xl border border-[#1a1f3e] bg-[#0f1225] p-3 shadow-sm hover:-translate-y-[3px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)] hover:border-[#2a2f5e] transition-all duration-[250ms] cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {lead.profile_pic_url ? (
            <img src={lead.profile_pic_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-muted-foreground">
              {(lead.name || lead.instagram_username)[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Link
            href={`/leads/${lead.id}`}
            className="text-sm font-medium hover:underline truncate block"
            onClick={(e) => e.stopPropagation()}
          >
            {lead.name || `@${lead.instagram_username}`}
          </Link>
          <p className="text-xs text-muted-foreground truncate">@{lead.instagram_username}</p>
        </div>

        {isOverdue && (
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
        )}
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      {stageTime && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{stageTime}</span>
        </div>
      )}
    </div>
  )
}
