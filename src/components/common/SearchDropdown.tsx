'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, X, Loader2 } from 'lucide-react'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import type { LeadStage } from '@/lib/types'

const STAGE_LABELS: Record<string, string> = {
  novo: 'Novo', lead_frio: 'Lead Frio', rapport: 'Rapport',
  social_selling: 'Social Selling', spin: 'SPIN', call_agendada: 'Call Agendada',
  fechado: 'Fechado', perdido: 'Perdido', follow_up: 'Follow-up',
}

const STAGE_BADGE: Record<string, string> = {
  novo: 'bg-[#3B82F6]/10 text-[#2563EB]',
  lead_frio: 'bg-[#6B7280]/10 text-[#4B5563]',
  rapport: 'bg-[#A855F7]/10 text-[#9333EA]',
  social_selling: 'bg-[#EC4899]/10 text-[#DB2777]',
  spin: 'bg-[#F97316]/10 text-[#EA580C]',
  call_agendada: 'bg-[#FACC15]/10 text-[#CA8A04]',
  fechado: 'bg-[#10B981]/10 text-[#059669]',
  perdido: 'bg-[#EF4444]/10 text-[#DC2626]',
  follow_up: 'bg-[#C8E645]/15 text-[#5A6B00]',
}

interface SearchResult {
  id: string
  instagram_username: string
  name: string | null
  profile_pic_url: string | null
  stage: LeadStage
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)
}

function highlightMatch(text: string, term: string) {
  if (!term || term.length < 2) return text
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-[#C8E645]/30 text-[#111827] rounded-sm px-0.5">{part}</mark>
      : part
  )
}

export function SearchDropdown() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const clean = q.replace('@', '').trim()

    const { data } = await supabase
      .from('leads')
      .select('id, instagram_username, name, profile_pic_url, stage')
      .or(`instagram_username.ilike.%${clean}%,name.ilike.%${clean}%`)
      .limit(6)

    setResults(data || [])
    setOpen(true)
    setLoading(false)
    setSelectedIndex(-1)
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 2) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  function selectResult(leadId: string) {
    setQuery('')
    setResults([])
    setOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
    router.push(`/leads/${leadId}`)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setQuery('')
      setResults([])
      setOpen(false)
      setSelectedIndex(-1)
      inputRef.current?.blur()
      return
    }

    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      selectResult(results[selectedIndex].id)
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handleShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  const isFocused = open || query.length > 0

  return (
    <div ref={containerRef} className="relative hidden md:block">
      {/* Input container — controls border/focus, not the input */}
      <div className={`flex items-center bg-[#F7F8F9] border-[1.5px] px-4 py-2 rounded-full w-[380px] transition-all duration-200 ${isFocused
          ? 'border-[#C8E645] bg-white shadow-[0_0_0_3px_rgba(200,230,69,0.12)]'
          : 'border-[#EFEFEF] hover:border-[#D1D5DB]'
        }`}>
        {loading ? (
          <Loader2 className="w-[18px] h-[18px] text-[#C8E645] animate-spin flex-shrink-0" />
        ) : (
          <Search className="w-[18px] h-[18px] text-[#9CA3AF] flex-shrink-0" />
        )}

        <input
          ref={inputRef}
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar leads, calls ou tarefas..."
          className="bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-[13px] text-[#374151] w-full ml-2.5 placeholder-[#9CA3AF] py-0"
        />

        {query ? (
          <button
            onClick={clearSearch}
            className="w-5 h-5 rounded-full bg-[#E5E7EB] hover:bg-[#D1D5DB] flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <X className="w-3 h-3 text-[#6B7280]" />
          </button>
        ) : (
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-[#C0C7D0] bg-white border border-[#EFEFEF] px-1.5 py-0.5 rounded flex-shrink-0">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[14px] border border-[#EFEFEF] shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden z-50 animate-dropdown-in">
          {results.length > 0 ? (
            <div className="py-1.5">
              <p className="px-4 py-1.5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">
                Leads
              </p>
              {results.map((lead, index) => (
                <button
                  key={lead.id}
                  onClick={() => selectResult(lead.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${index === selectedIndex ? 'bg-[#C8E645]/8' : 'hover:bg-[#F7F8F9]'
                    }`}
                >
                  <LeadAvatar name={lead.name} username={lead.instagram_username} photoUrl={lead.profile_pic_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#111827] truncate">
                      {highlightMatch(lead.name || lead.instagram_username, query)}
                    </p>
                    {lead.name && lead.instagram_username && (
                      <p className="text-[11px] text-[#9CA3AF] truncate">
                        @{highlightMatch(lead.instagram_username, query)}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STAGE_BADGE[lead.stage] || 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>
                    {STAGE_LABELS[lead.stage] || lead.stage}
                  </span>
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[13px] text-[#9CA3AF]">Nenhum lead encontrado para &ldquo;{query}&rdquo;</p>
            </div>
          ) : null}

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[#F5F5F5] flex items-center justify-between">
            <span className="text-[10px] text-[#C0C7D0]">
              {results.length > 0 ? `${results.length} resultado${results.length > 1 ? 's' : ''}` : 'Digite para buscar'}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-[#C0C7D0]">
              <span className="flex items-center gap-0.5">
                <kbd className="bg-[#F3F4F6] px-1 py-0.5 rounded text-[9px]">↑↓</kbd> navegar
              </span>
              <span className="flex items-center gap-0.5">
                <kbd className="bg-[#F3F4F6] px-1 py-0.5 rounded text-[9px]">↵</kbd> abrir
              </span>
              <span className="flex items-center gap-0.5">
                <kbd className="bg-[#F3F4F6] px-1 py-0.5 rounded text-[9px]">esc</kbd> fechar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
