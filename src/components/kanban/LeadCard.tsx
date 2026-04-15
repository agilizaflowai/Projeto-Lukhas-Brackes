'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, MoreHorizontal, ExternalLink, Calendar, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lead } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, getLeadDisplayName, getLeadDisplayUsername } from '@/lib/utils'

/* ═══ Tag colors ═══ */

function getTagStyle(tag: string): string {
  const t = tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (['emagrecer', 'emagrecimento', 'perder peso'].some(k => t.includes(k)))
    return 'bg-[#D7F5E1] text-[#006E33]'
  if (['hipertrofia', 'massa', 'shape'].some(k => t.includes(k)))
    return 'bg-[#E0F2FE] text-[#0369A1]'
  if (['saude', 'qualidade'].some(k => t.includes(k)))
    return 'bg-[#FEF3C7] text-[#92400E]'
  if (['performance', 'atleta'].some(k => t.includes(k)))
    return 'bg-[#FEE2E2] text-[#991B1B]'
  if (['mae', 'gestante', 'solo'].some(k => t.includes(k)))
    return 'bg-[#F3E8FF] text-[#7C3AED]'
  if (['empresario', 'empresaria', 'executivo'].some(k => t.includes(k)))
    return 'bg-[#FFF7ED] text-[#C2410C]'
  if (['estudante', 'jovem', 'universitario'].some(k => t.includes(k)))
    return 'bg-[#ECFDF5] text-[#065F46]'
  if (['sedentario', 'sedentaria', 'iniciante', 'comecando'].some(k => t.includes(k)))
    return 'bg-[#F1F5F9] text-[#475569]'
  if (['intermediario', 'avancada', 'avancado'].some(k => t.includes(k)))
    return 'bg-[#DBEAFE] text-[#1E40AF]'
  if (['medica', 'medico', 'enfermeira'].some(k => t.includes(k)))
    return 'bg-[#ECFEFF] text-[#155E75]'
  if (['pilates', 'yoga', 'funcional'].some(k => t.includes(k)))
    return 'bg-[#FDF4FF] text-[#86198F]'
  if (['voltando', 'retorno'].some(k => t.includes(k)))
    return 'bg-[#FEF9C3] text-[#854D0E]'
  if (['30+', '40+', '50+'].some(k => t.includes(k)))
    return 'bg-[#F5F5F4] text-[#57534E]'
  if (['urgente'].some(k => t.includes(k)))
    return 'bg-[#FEE2E2] text-[#DC2626]'
  if (['whatsapp'].some(k => t.includes(k)))
    return 'bg-[#D1FAE5] text-[#065F46]'

  return 'bg-[#F3F4F6] text-[#374151]'
}

/* ═══ Component ═══ */

interface LeadCardProps {
  lead: Lead
  stageColor: string
  overlay?: boolean
}

export function LeadCard({ lead, stageColor, overlay }: LeadCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
    disabled: overlay,
  })

  const [menuOpen, setMenuOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
      }

  const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date()
  const stageTime = lead.stage_changed_at
    ? formatDistanceToNow(new Date(lead.stage_changed_at), { locale: ptBR, addSuffix: false })
    : null

  // Username display logic
  const displayName = getLeadDisplayName(lead)
  const displayUsername = getLeadDisplayUsername(lead) || ''
  const initials = displayName.slice(0, 2).toUpperCase()

  // Stage-specific info
  let stageInfo: { icon: string; text: string; color: string } | null = null
  if (lead.stage === 'follow_up' && lead.next_follow_up_at) {
    const diff = Math.ceil((new Date(lead.next_follow_up_at).getTime() - Date.now()) / 86400000)
    if (diff > 0) stageInfo = { icon: '🔄', text: `Próximo: ${diff} dia${diff > 1 ? 's' : ''}`, color: 'text-[#06B6D4]' }
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={{ ...style, borderLeft: `3px solid ${stageColor}` }}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      className={cn(
        'group bg-white rounded-[16px] border border-[#EFEFEF] p-[14px] pl-[11px]',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]',
        'cursor-grab active:cursor-grabbing',
        'hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.09)]',
        'transition-all duration-200',
        isDragging && 'opacity-50',
        overlay && 'rotate-[2deg] scale-[1.03] shadow-[0_8px_30px_rgba(0,0,0,0.18)] cursor-grabbing',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-[10px]">
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: `${stageColor}20`, color: stageColor }}
        >
          {lead.profile_pic_url && !imgError ? (
            <img src={lead.profile_pic_url} alt="" className="w-full h-full rounded-full object-cover" onError={() => setImgError(true)} referrerPolicy="no-referrer" loading="lazy" />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/leads/${lead.id}`}
            onClick={e => e.stopPropagation()}
            className="text-[13px] font-bold text-[#1B3A2D] truncate block hover:underline"
          >
            {displayName}
          </Link>
          {displayUsername ? (
            <p className="text-[11px] text-[#9CA3AF] truncate">{displayUsername}</p>
          ) : displayName.startsWith('Lead #') ? (
            <p className="text-[11px] text-[#D1D5DB] italic truncate">Perfil não identificado</p>
          ) : null}
        </div>

        {stageTime && (
          <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">{stageTime}</span>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-[#F5F5F5] my-[8px]" />

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-[4px] mb-[8px]">
          {lead.tags.slice(0, 3).map(tag => (
            <span key={tag} className={cn('text-[10px] font-bold px-2 py-[3px] rounded-[6px]', getTagStyle(tag))}>
              {tag.toUpperCase()}
            </span>
          ))}
          {lead.tags.length > 3 && (
            <span className="text-[10px] text-[#9CA3AF]">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          {lead.assigned_to === 'ia' && (
            <span className="inline-flex items-center gap-1.5 bg-[#C8E645]/20 text-[#62721D] text-[10px] font-bold px-2.5 py-1 rounded-[6px]">
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a2 2 0 0 1 2 2v1h1a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a2 2 0 0 1 2-2zm0 1.5a.5.5 0 0 0-.5.5v1h1V3a.5.5 0 0 0-.5-.5zM6 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
              </svg>
              IA
            </span>
          )}
          {lead.assigned_to === 'lukhas' && (
            <span className="inline-flex items-center gap-1.5 bg-[#1B3A2D]/10 text-[#1B3A2D] text-[10px] font-bold px-2.5 py-1 rounded-[6px]">
              <div className="w-3 h-3 rounded-full bg-[#1B3A2D] flex items-center justify-center">
                <span className="text-[6px] text-white font-bold">L</span>
              </div>
              LUKHAS
            </span>
          )}
          {lead.assigned_to === 'assistente' && (
            <span className="inline-flex items-center gap-1.5 bg-[#3B82F6]/10 text-[#2563EB] text-[10px] font-bold px-2.5 py-1 rounded-[6px]">
              <div className="w-3 h-3 rounded-full bg-[#3B82F6] flex items-center justify-center">
                <span className="text-[6px] text-white font-bold">A</span>
              </div>
              ASSIST.
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isOverdue && (
            <AlertTriangle className="w-[14px] h-[14px] text-[#F59E0B]" />
          )}

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={e => { e.stopPropagation(); e.preventDefault(); setMenuOpen(!menuOpen) }}
              onPointerDown={e => e.stopPropagation()}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C0C7D0] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-[12px] border border-[#EFEFEF] shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-1 w-[180px] z-50">
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); router.push(`/leads/${lead.id}`) }}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F7F8F9] flex items-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver ficha completa
                </button>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F7F8F9] flex items-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5" /> Agendar call
                </button>
                <div className="border-t border-[#F5F5F5] my-1" />
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#EF4444] hover:bg-[#FEF2F2] flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Desativar lead
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stage-specific info */}
      {stageInfo && (
        <p className={`${stageInfo.color} text-[11px] font-medium mt-[6px]`}>
          {stageInfo.icon} {stageInfo.text}
        </p>
      )}
    </div>
  )
}
