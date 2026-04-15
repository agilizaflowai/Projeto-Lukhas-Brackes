'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ChevronDown, Check, AlertCircle, Plus } from 'lucide-react'

interface NewLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const SOURCES = [
  { value: 'instagram_comment', label: 'Comentário Instagram', color: '#C8E645' },
  { value: 'instagram_story', label: 'Story Reply', color: '#3ECFB2' },
  { value: 'instagram_dm', label: 'DM Direta', color: '#3B82F6' },
  { value: 'instagram_follow', label: 'Novo Seguidor', color: '#8B5CF6' },
  { value: 'instagram_like', label: 'Curtida', color: '#EC4899' },
  { value: 'indicacao', label: 'Indicação', color: '#F59E0B' },
  { value: 'manual', label: 'Manual', color: '#6B7280' },
]

export function NewLeadModal({ open, onOpenChange, onCreated }: NewLeadModalProps) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [source, setSource] = useState('manual')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceOpen, setSourceOpen] = useState(false)
  const sourceRef = useRef<HTMLDivElement>(null)

  // Close dropdown on escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && sourceOpen) setSourceOpen(false)
    }
    if (sourceOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sourceOpen])

  const selectedSource = SOURCES.find(s => s.value === source)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanUsername = username.replace('@', '').trim()
    if (!cleanUsername) {
      setError('Username é obrigatório')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('instagram_username', cleanUsername)
      .maybeSingle()

    if (existing) {
      setError('Lead já cadastrado com esse @username')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('leads').insert({
      instagram_username: cleanUsername,
      name: name.trim() || null,
      source,
      tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      stage: 'novo',
      assigned_to: 'ia',
      is_active: true,
      follow_up_count: 0,
      follows_lukhas: false,
      lukhas_follows: false,
    })

    setSaving(false)

    if (insertError) {
      setError('Erro ao criar lead. Tente novamente.')
      return
    }

    setUsername('')
    setName('')
    setSource('manual')
    setTags('')
    onOpenChange(false)
    onCreated?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <p className="text-sm text-[#9CA3AF] mt-1">Cadastre um novo lead no pipeline</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
              @Username *
            </label>
            <div className="flex items-center bg-[#F7F8F9] border border-[#EFEFEF] rounded-xl px-4 py-2.5 focus-within:border-[#C8E645] transition-colors">
              <span className="text-[#9CA3AF] text-sm mr-1">@</span>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(null) }}
                placeholder="usuario_instagram"
                className="bg-transparent w-full text-sm text-[#1B3A2D] focus:outline-none placeholder-[#9CA3AF]"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome completo"
              className="w-full bg-[#F7F8F9] border border-[#EFEFEF] rounded-xl px-4 py-2.5 text-sm text-[#1B3A2D] focus:outline-none focus:border-[#C8E645] transition-colors placeholder-[#9CA3AF]"
            />
          </div>

          {/* Origem — custom dropdown */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
              Origem
            </label>
            <div className="relative" ref={sourceRef}>
              <button
                type="button"
                onClick={() => setSourceOpen(!sourceOpen)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5',
                  'bg-[#F7F8F9] border rounded-xl text-left transition-all text-sm',
                  sourceOpen
                    ? 'border-[#C8E645] bg-white shadow-[0_0_0_3px_rgba(200,230,69,0.15)]'
                    : 'border-[#EFEFEF] hover:border-[#C8E645]/40',
                  'text-[#1B3A2D] font-medium'
                )}
              >
                <div className="flex items-center gap-2">
                  {selectedSource && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedSource.color }} />
                  )}
                  <span>{selectedSource?.label || 'Selecionar origem'}</span>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-[#9CA3AF] transition-transform', sourceOpen && 'rotate-180')} />
              </button>

              {sourceOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSourceOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[12px] border border-[#EFEFEF] shadow-[0_4px_24px_rgba(0,0,0,0.10)] py-1.5 z-50 animate-dropdown-in max-h-[240px] overflow-y-auto dropdown-scroll">
                    {SOURCES.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSource(opt.value); setSourceOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors',
                          source === opt.value
                            ? 'text-[#111827] font-semibold bg-[#C8E645]/8'
                            : 'text-[#374151] hover:bg-[#F7F8F9]'
                        )}
                      >
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {source === opt.value ? (
                            <Check className="w-3.5 h-3.5 text-[#C8E645]" />
                          ) : (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                          )}
                        </div>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="fitness, emagrecimento, bulking (separar por vírgula)"
              className="w-full bg-[#F7F8F9] border border-[#EFEFEF] rounded-xl px-4 py-2.5 text-sm text-[#1B3A2D] focus:outline-none focus:border-[#C8E645] transition-colors placeholder-[#9CA3AF]"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
              <span className="text-[13px] text-[#EF4444] font-medium">{error}</span>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full text-sm font-bold bg-[#1B3A2D] text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Lead
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
