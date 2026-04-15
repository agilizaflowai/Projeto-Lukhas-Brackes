'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownPortalProps {
  open: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  className?: string
  maxHeight?: number
  minWidth?: number
}

export function DropdownPortal({
  open,
  onClose,
  triggerRef,
  children,
  className,
  maxHeight = 280,
  minWidth = 180,
}: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open || !triggerRef.current) return

    function update() {
      const rect = triggerRef.current!.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openDown = spaceBelow >= maxHeight || spaceBelow >= spaceAbove

      setPos({
        top: openDown ? rect.bottom + 4 : rect.top - Math.min(maxHeight, spaceAbove) - 4,
        left: rect.left,
        width: Math.max(rect.width, minWidth),
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, triggerRef, maxHeight, minWidth])

  // Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className={cn(
          'fixed z-[9999] bg-white rounded-[12px] border border-[#EFEFEF]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.12)]',
          'py-1.5 animate-dropdown-in overflow-hidden',
          className
        )}
        style={{
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          width: `${pos.width}px`,
          maxHeight: `${maxHeight}px`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="overflow-y-auto overscroll-contain dropdown-scroll"
          style={{ maxHeight: `${maxHeight - 12}px` }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
