'use client'

import { useState, useRef, useEffect } from 'react'

interface TooltipData {
  label: string
  value: number
  suffix?: string
  extra?: string
}

interface ChartTooltipProps {
  data: TooltipData | null
  x: number
  y: number
  visible: boolean
}

export function ChartTooltip({ data, x, y, visible }: ChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!ref.current || !visible) return
    const rect = ref.current.getBoundingClientRect()
    const parentRect = ref.current.offsetParent?.getBoundingClientRect()
    if (!parentRect) return

    let nx = x - rect.width / 2
    let ny = y - rect.height - 12

    if (nx < 0) nx = 4
    if (nx + rect.width > parentRect.width) nx = parentRect.width - rect.width - 4
    if (ny < 0) ny = y + 16

    setPos({ x: nx, y: ny })
  }, [x, y, visible])

  if (!visible || !data) return null

  return (
    <div
      ref={ref}
      className="absolute z-30 pointer-events-none transition-opacity duration-150"
      style={{ left: pos.x, top: pos.y, opacity: visible ? 1 : 0 }}
    >
      <div className="bg-white rounded-xl border border-[#EFEFEF] px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
        <p className="text-[11px] font-medium text-[#9CA3AF] mb-1">{data.label}</p>
        <p className="text-[18px] font-bold text-[#111827]">
          {data.value}{data.suffix || ''}
        </p>
        {data.extra && (
          <p className="text-[11px] text-[#6B7280]">{data.extra}</p>
        )}
      </div>
    </div>
  )
}

export function useChartTooltip() {
  const [tooltip, setTooltip] = useState<{
    data: TooltipData | null
    x: number
    y: number
    visible: boolean
  }>({ data: null, x: 0, y: 0, visible: false })

  const show = (e: React.MouseEvent, data: TooltipData) => {
    const rect = (e.currentTarget as HTMLElement).closest('[data-chart-container]')?.getBoundingClientRect()
    if (!rect) return
    const elRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({
      data,
      x: elRect.left - rect.left + elRect.width / 2,
      y: elRect.top - rect.top,
      visible: true,
    })
  }

  const hide = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  return { tooltip, show, hide }
}
