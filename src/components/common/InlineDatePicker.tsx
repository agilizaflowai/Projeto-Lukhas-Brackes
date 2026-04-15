'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfToday,
  addMonths,
  subMonths,
  getDay,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface InlineDatePickerProps {
  selected: Date | null
  onSelect: (date: Date) => void
}

export function InlineDatePicker({ selected, onSelect }: InlineDatePickerProps) {
  const today = startOfToday()
  const [currentMonth, setCurrentMonth] = useState(selected || today)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const startDay = getDay(monthStart)
  const blanks = Array.from({ length: startDay }, (_, i) => i)

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className="w-full max-w-[340px] mx-auto">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-[#6B7280]" />
        </button>
        <span className="text-[13px] font-semibold text-[#111827] capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F3F4F6] transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 mb-0.5">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-[#9CA3AF] py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {blanks.map(i => (
          <div key={`blank-${i}`} className="h-9" />
        ))}

        {days.map(day => {
          const isPast = isBefore(day, today)
          const isSelected = selected && isSameDay(day, selected)
          const isTodayDate = isToday(day)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => !isPast && onSelect(day)}
              disabled={isPast}
              className={cn(
                'h-9 w-full flex items-center justify-center text-[13px] rounded-full transition-all duration-150',
                isSelected
                  ? 'bg-[#C8E645] text-[#111827] font-bold shadow-[0_2px_8px_rgba(200,230,69,0.4)]'
                  : isTodayDate
                    ? 'ring-2 ring-[#1B3A2D] text-[#1B3A2D] font-bold'
                    : isPast
                      ? 'text-[#D1D5DB] cursor-not-allowed'
                      : 'text-[#374151] hover:bg-[#F3F4F6]'
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
