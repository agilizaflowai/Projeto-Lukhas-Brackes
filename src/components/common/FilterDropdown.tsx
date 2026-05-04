'use client'

import { useState, useRef } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from './DropdownPortal'

interface FilterOption {
  value: string
  label: string
  icon?: React.ReactNode
  count?: number
}

interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  icon?: React.ReactNode
}

export function FilterDropdown({ label, options, value, onChange, icon }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)

  const hasValue = value !== ''
  const selectedOption = options.find(o => o.value === value)
  const selectedLabel = selectedOption?.label || label

  const filteredOptions = searchQuery
    ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options

  function handleSelect(optValue: string) {
    onChange(optValue)
    setOpen(false)
    setSearchQuery('')
  }

  function clearFilter(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setSearchQuery('')
  }

  return (
    <div className="flex-shrink-0">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium',
          'border transition-all duration-200 cursor-pointer select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E645]/30',
          hasValue
            ? 'bg-[#C8E645]/10 border-[#C8E645]/30 text-[#3D4F00]'
            : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C8E645]/50 hover:text-[#374151]',
          open && 'border-[#C8E645] shadow-[0_0_0_3px_rgba(200,230,69,0.12)]'
        )}
      >
        {icon && <span className="w-4 h-4 flex-shrink-0 opacity-60">{icon}</span>}
        <span className="truncate max-w-[120px]">{hasValue ? selectedLabel : label}</span>
        {hasValue ? (
          <span
            role="button"
            onClick={clearFilter}
            className="w-4 h-4 rounded-full bg-[#374151]/10 hover:bg-[#EF4444]/10 hover:text-[#EF4444] flex items-center justify-center transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        ) : (
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-180')} />
        )}
      </button>

      <DropdownPortal open={open} onClose={() => { setOpen(false); setSearchQuery('') }} triggerRef={triggerRef} minWidth={200}>
        {options.length > 6 && (
          <div className="px-3 pb-2 mb-1 border-b border-[#F5F5F5]">
            <input
              autoFocus
              placeholder="Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-[13px] text-[#374151] placeholder-[#C0C7D0] bg-[#F7F8F9] rounded-lg px-3 py-2 border-none focus:ring-0 focus:outline-none focus:bg-[#F0F4F8]"
            />
          </div>
        )}

        {/* "All" option */}
        <button
          onClick={() => { onChange(''); setOpen(false); setSearchQuery('') }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors',
            !hasValue
              ? 'text-[#111827] font-semibold bg-[#F7F8F9]'
              : 'text-[#6B7280] hover:bg-[#F7F8F9] hover:text-[#374151]'
          )}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {!hasValue && <Check className="w-3.5 h-3.5 text-[#C8E645]" />}
          </div>
          {label}
        </button>

        <div className="h-px bg-[#F5F5F5] my-1" />

        {filteredOptions.map(option => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors',
                isSelected
                  ? 'text-[#111827] font-semibold bg-[#C8E645]/8'
                  : 'text-[#374151] hover:bg-[#F7F8F9]'
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                {isSelected && <Check className="w-3.5 h-3.5 text-[#C8E645]" />}
              </div>
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span className="flex-1 text-left truncate">{option.label}</span>
              {option.count !== undefined && (
                <span className="text-[11px] text-[#9CA3AF] font-medium tabular-nums">{option.count}</span>
              )}
            </button>
          )
        })}

        {filteredOptions.length === 0 && (
          <div className="px-3 py-4 text-center text-[13px] text-[#9CA3AF]">Nenhum resultado</div>
        )}
      </DropdownPortal>
    </div>
  )
}

interface MultiFilterDropdownProps {
  label: string
  options: FilterOption[]
  value: string[]
  onChange: (value: string[]) => void
  icon?: React.ReactNode
}

export function MultiFilterDropdown({ label, options, value, onChange, icon }: MultiFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)

  const hasValue = value.length > 0
  const selectedLabel = value.length === 1
    ? options.find(o => o.value === value[0])?.label || label
    : value.length > 1
      ? `${value.length} tags`
      : label

  const filteredOptions = searchQuery
    ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options

  function handleSelect(optValue: string) {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  function clearFilter(e: React.MouseEvent) {
    e.stopPropagation()
    onChange([])
    setSearchQuery('')
  }

  return (
    <div className="flex-shrink-0">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium',
          'border transition-all duration-200 cursor-pointer select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E645]/30',
          hasValue
            ? 'bg-[#C8E645]/10 border-[#C8E645]/30 text-[#3D4F00]'
            : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C8E645]/50 hover:text-[#374151]',
          open && 'border-[#C8E645] shadow-[0_0_0_3px_rgba(200,230,69,0.12)]'
        )}
      >
        {icon && <span className="w-4 h-4 flex-shrink-0 opacity-60">{icon}</span>}
        <span className="truncate max-w-[120px]">{hasValue ? selectedLabel : label}</span>
        {hasValue ? (
          <span
            role="button"
            onClick={clearFilter}
            className="w-4 h-4 rounded-full bg-[#374151]/10 hover:bg-[#EF4444]/10 hover:text-[#EF4444] flex items-center justify-center transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        ) : (
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-180')} />
        )}
      </button>

      <DropdownPortal open={open} onClose={() => { setOpen(false); setSearchQuery('') }} triggerRef={triggerRef} minWidth={200}>
        {options.length > 6 && (
          <div className="px-3 pb-2 mb-1 border-b border-[#F5F5F5]">
            <input
              autoFocus
              placeholder="Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-[13px] text-[#374151] placeholder-[#C0C7D0] bg-[#F7F8F9] rounded-lg px-3 py-2 border-none focus:ring-0 focus:outline-none focus:bg-[#F0F4F8]"
            />
          </div>
        )}

        {/* "All" option */}
        <button
          onClick={() => { onChange([]); setOpen(false); setSearchQuery('') }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors',
            !hasValue
              ? 'text-[#111827] font-semibold bg-[#F7F8F9]'
              : 'text-[#6B7280] hover:bg-[#F7F8F9] hover:text-[#374151]'
          )}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {!hasValue && <Check className="w-3.5 h-3.5 text-[#C8E645]" />}
          </div>
          {label}
        </button>

        <div className="h-px bg-[#F5F5F5] my-1" />

        {filteredOptions.map(option => {
          const isSelected = value.includes(option.value)
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors',
                isSelected
                  ? 'text-[#111827] font-semibold bg-[#C8E645]/8'
                  : 'text-[#374151] hover:bg-[#F7F8F9]'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all',
                isSelected
                  ? 'bg-[#C8E645] shadow-[0_1px_3px_rgba(200,230,69,0.4)]'
                  : 'border-[1.5px] border-[#D1D5DB]'
              )}>
                {isSelected && <Check className="w-3 h-3 text-[#111827]" />}
              </div>
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span className="flex-1 text-left truncate">{option.label}</span>
              {option.count !== undefined && (
                <span className="text-[11px] text-[#9CA3AF] font-medium tabular-nums">{option.count}</span>
              )}
            </button>
          )
        })}

        {filteredOptions.length === 0 && (
          <div className="px-3 py-4 text-center text-[13px] text-[#9CA3AF]">Nenhum resultado</div>
        )}
      </DropdownPortal>
    </div>
  )
}
