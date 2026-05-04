'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTH_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

type QuickPeriod = 'hoje' | '7dias' | '30dias' | 'mes' | 'custom'

interface DateRange {
  from: Date
  to: Date
}

interface PeriodFilterProps {
  onChange: (range: DateRange, label: string) => void
  activePeriod?: string
}

function getRange(period: QuickPeriod, customMonth?: number, customYear?: number): DateRange {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (period) {
    case 'hoje':
      return { from: todayStart, to: todayEnd }
    case '7dias':
      return { from: new Date(todayStart.getTime() - 6 * 86400000), to: todayEnd }
    case '30dias':
      return { from: new Date(todayStart.getTime() - 29 * 86400000), to: todayEnd }
    case 'mes':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: todayEnd,
      }
    case 'custom': {
      const y = customYear ?? now.getFullYear()
      const m = customMonth ?? now.getMonth()
      return {
        from: new Date(y, m, 1),
        to: new Date(y, m + 1, 0, 23, 59, 59, 999),
      }
    }
  }
}

const LABEL_TO_PERIOD: Record<string, QuickPeriod> = {
  'Hoje': 'hoje',
  '7 dias': '7dias',
  'Últimos 7 dias': '7dias',
  '30 dias': '30dias',
  'Últimos 30 dias': '30dias',
  'Este mês': 'mes',
}

export function PeriodFilter({ onChange, activePeriod }: PeriodFilterProps) {
  const now = new Date()
  const [active, setActive] = useState<QuickPeriod>('hoje')

  // Sync with external activePeriod
  useEffect(() => {
    if (activePeriod) {
      const mapped = LABEL_TO_PERIOD[activePeriod]
      if (mapped) {
        setActive(mapped)
        setSelectedMonth(null)
        setSelectedYear(null)
      }
    }
  }, [activePeriod])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    if (showPicker) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPicker])

  const quickPeriods: { value: QuickPeriod; label: string }[] = [
    { value: 'hoje', label: 'Hoje' },
    { value: '7dias', label: '7 dias' },
    { value: '30dias', label: '30 dias' },
    { value: 'mes', label: 'Este mês' },
  ]

  const PERIOD_LABELS: Record<QuickPeriod, string> = {
    hoje: 'Hoje',
    '7dias': 'Últimos 7 dias',
    '30dias': 'Últimos 30 dias',
    mes: 'Este mês',
    custom: '',
  }

  function selectQuick(p: QuickPeriod) {
    setActive(p)
    setSelectedMonth(null)
    setSelectedYear(null)
    setShowPicker(false)
    onChange(getRange(p), PERIOD_LABELS[p])
  }

  function selectMonth(m: number) {
    setSelectedMonth(m)
    setSelectedYear(pickerYear)
    setActive('custom')
    setShowPicker(false)
    onChange(getRange('custom', m, pickerYear), `${MONTH_FULL[m]} ${pickerYear}`)
  }

  function isFuture(year: number, month: number) {
    return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth())
  }

  const customLabel = selectedMonth !== null && selectedYear !== null
    ? `${MONTH_FULL[selectedMonth]} ${selectedYear}`
    : 'Personalizado'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex p-1 bg-[#F3F4F6] rounded-full">
        {quickPeriods.map((p) => (
          <button
            key={p.value}
            onClick={() => selectQuick(p.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
              active === p.value && active !== 'custom'
                ? 'bg-white text-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.06)] font-bold'
                : 'text-[#6B7280]/60 hover:text-[#374151]'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border rounded-full text-sm transition-all duration-200',
            active === 'custom'
              ? 'bg-white border-[#C8E645] text-[#111827] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
              : 'bg-white border-[#EFEFEF] text-[#6B7280] hover:border-[#C8E645]'
          )}
        >
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">{customLabel}</span>
          <ChevronDown className={cn('w-3 h-3 transition-transform', showPicker && 'rotate-180')} />
        </button>

        {showPicker && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl border border-[#EFEFEF] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-5 w-[280px] max-w-[calc(100vw-32px)] z-50">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setPickerYear(pickerYear - 1)}
                className="w-8 h-8 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
              </button>
              <span className="text-[15px] font-bold text-[#111827]">{pickerYear}</span>
              <button
                onClick={() => {
                  if (pickerYear < now.getFullYear()) setPickerYear(pickerYear + 1)
                }}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  pickerYear >= now.getFullYear() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#F3F4F6]'
                )}
                disabled={pickerYear >= now.getFullYear()}
              >
                <ChevronRight className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((month, i) => {
                const future = isFuture(pickerYear, i)
                const isSelected = selectedMonth === i && selectedYear === pickerYear
                return (
                  <button
                    key={i}
                    disabled={future}
                    onClick={() => selectMonth(i)}
                    className={cn(
                      'py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                      isSelected
                        ? 'bg-[#C8E645] text-[#111827] font-bold'
                        : future
                        ? 'text-[#D1D5DB] cursor-not-allowed'
                        : 'text-[#374151] hover:bg-[#F3F4F6]'
                    )}
                  >
                    {month}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export type { DateRange }
