'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Column } from './Column'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils'
import type { Lead, LeadStage } from '@/lib/types'

const COLUMNS: { id: LeadStage; title: string; color: string }[] = [
  { id: 'novo', title: 'NOVO', color: '#3B82F6' },
  { id: 'rapport', title: 'RAPPORT', color: '#A855F7' },
  { id: 'social_selling', title: 'SOCIAL SELLING', color: '#EC4899' },
  { id: 'spin', title: 'SPIN', color: '#F97316' },
  { id: 'call_agendada', title: 'CALL AGEND.', color: '#FACC15' },
  { id: 'fechado', title: 'FECHOU', color: '#10B981' },
  { id: 'perdido', title: 'NÃO FECHOU', color: '#EF4444' },
  { id: 'follow_up', title: 'FOLLOW-UP', color: '#06B6D4' },
]

// Column width (272px) + gap (16px)
const SCROLL_STEP = 288

interface BoardProps {
  leads: Lead[]
  onStageChange: (leadId: string, newStage: LeadStage) => void
}

export function Board({ leads, onStageChange }: BoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(true)
  const [topScrollWidth, setTopScrollWidth] = useState(0)

  const boardRef = useRef<HTMLDivElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const scrollOwner = useRef<'top' | 'board' | null>(null)
  const scrollRaf = useRef<number>(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const activeLead = leads.find(l => l.id === activeId)
  const activeColor = activeLead
    ? COLUMNS.find(c => c.id === activeLead.stage)?.color || '#9CA3AF'
    : '#9CA3AF'

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

    let newStage: LeadStage | undefined
    const col = COLUMNS.find(c => c.id === over.id)
    if (col) {
      newStage = col.id
    } else {
      const targetLead = leads.find(l => l.id === over.id)
      if (targetLead) newStage = targetLead.stage
    }

    if (newStage && newStage !== lead.stage) {
      onStageChange(leadId, newStage)
    }
  }

  // Scroll handler — sync top bar + update fades
  const handleBoardScroll = useCallback(() => {
    const board = boardRef.current
    if (!board) return

    // Sync top bar directly in DOM
    if (scrollOwner.current !== 'top' && topBarRef.current) {
      topBarRef.current.scrollLeft = board.scrollLeft
    }

    // Debounce state updates
    cancelAnimationFrame(scrollRaf.current)
    scrollRaf.current = requestAnimationFrame(() => {
      if (!board) return
      setShowLeftFade(board.scrollLeft > 20)
      setShowRightFade(board.scrollLeft < board.scrollWidth - board.clientWidth - 20)
    })
  }, [])

  const handleTopScroll = useCallback(() => {
    if (scrollOwner.current !== 'board' && boardRef.current && topBarRef.current) {
      boardRef.current.scrollLeft = topBarRef.current.scrollLeft
    }
  }, [])

  // Keep top bar width in sync
  useEffect(() => {
    function sync() {
      if (boardRef.current) setTopScrollWidth(boardRef.current.scrollWidth)
      handleBoardScroll()
    }
    sync()
    window.addEventListener('resize', sync)
    const observer = new ResizeObserver(sync)
    if (boardRef.current) observer.observe(boardRef.current)
    return () => { window.removeEventListener('resize', sync); observer.disconnect() }
  }, [handleBoardScroll])

  // Keyboard: scrollBy with native smooth
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

      e.preventDefault()
      const direction = e.key === 'ArrowRight' ? 1 : -1
      boardRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Top scrollbar */}
      <div
        ref={topBarRef}
        onScroll={handleTopScroll}
        onPointerDown={() => { scrollOwner.current = 'top' }}
        onPointerUp={() => { scrollOwner.current = null }}
        onPointerLeave={() => { if (scrollOwner.current === 'top') scrollOwner.current = null }}
        className="overflow-x-auto mb-2 kanban-board"
      >
        <div style={{ width: topScrollWidth, height: 1 }} />
      </div>

      {/* Board with fades */}
      <div className="relative">
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#f8faf7] to-transparent z-10 pointer-events-none transition-opacity duration-200',
            showLeftFade ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f8faf7] to-transparent z-10 pointer-events-none transition-opacity duration-200',
            showRightFade ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div
          ref={boardRef}
          onScroll={handleBoardScroll}
          onPointerDown={() => { scrollOwner.current = 'board' }}
          onPointerUp={() => { scrollOwner.current = null }}
          onPointerLeave={() => { if (scrollOwner.current === 'board') scrollOwner.current = null }}
          className="flex gap-4 overflow-x-auto overflow-y-visible pb-4 min-h-[calc(100vh-280px)] kanban-board"
        >
          {COLUMNS.map(col => (
            <div
              key={col.id}
              className="flex-shrink-0"
            >
              <Column
                id={col.id}
                title={col.title}
                color={col.color}
                leads={leads.filter(l => l.stage === col.id)}
              />
            </div>
          ))}
        </div>
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {activeLead ? (
          <LeadCard lead={activeLead} stageColor={activeColor} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export { COLUMNS }
