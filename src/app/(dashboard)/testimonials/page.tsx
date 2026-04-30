'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { DropdownPortal } from '@/components/common/DropdownPortal'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Award, Trophy, ChevronDown, Check, Play, AlertTriangle, ImagePlus, Film, Loader2 } from 'lucide-react'
import type { Testimonial } from '@/lib/types'

const MEDIA_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
const MEDIA_ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm'
const MEDIA_MAX_BYTES = 50 * 1024 * 1024

function formatMediaSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function inferMediaType(mime: string): 'image' | 'video' {
  return mime.startsWith('video/') ? 'video' : 'image'
}

function InlineSelect({ value, options, onChange, placeholder = '—', className: wrapClass }: {
  value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = options.find(o => o.value === value)

  return (
    <div className={cn('relative', wrapClass)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'bg-[#F7F8F9] border-[1.5px] rounded-[10px] text-left transition-all text-[14px]',
          open
            ? 'border-[#C8E645] bg-white shadow-[0_0_0_3px_rgba(200,230,69,0.15)]'
            : 'border-[#E5E7EB] hover:border-[#C8E645]/40',
          selected ? 'text-[#374151] font-medium' : 'text-[#C0C7D0]'
        )}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#9CA3AF] transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>
      <DropdownPortal open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} minWidth={160} maxHeight={220}>
        {/* Clear option */}
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false) }}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors',
            !value ? 'text-[#111827] font-semibold bg-[#F7F8F9]' : 'text-[#6B7280] hover:bg-[#F7F8F9]'
          )}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {!value && <Check className="w-3.5 h-3.5 text-[#C8E645]" />}
          </div>
          {placeholder}
        </button>
        <div className="h-px bg-[#F5F5F5] my-0.5" />
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onChange(opt.value); setOpen(false) }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors',
              value === opt.value
                ? 'text-[#111827] font-semibold bg-[#C8E645]/8'
                : 'text-[#374151] hover:bg-[#F7F8F9]'
            )}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {value === opt.value && <Check className="w-3.5 h-3.5 text-[#C8E645]" />}
            </div>
            {opt.label}
          </button>
        ))}
      </DropdownPortal>
    </div>
  )
}

const EMPTY: Partial<Testimonial> = {
  student_name: '', student_instagram: null, content: '', media_url: '', media_type: null,
  student_gender: null, student_fitness_level: null, student_goal: null,
  student_context: null, result_summary: null, source: null, tags: [], is_active: true,
}

export default function TestimonialsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<Partial<Testimonial>>(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filterGender, setFilterGender] = useState('')
  const [filterGoal, setFilterGoal] = useState('')
  const [filterContext, setFilterContext] = useState('')

  // Upload de mídia (imagem/vídeo) do depoimento
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lightbox pra visualizar mídia ao clicar no card
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: string } | null>(null)

  // Toast de feedback (erros e sucesso)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(type: 'success' | 'error', message: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ type, message })
    toastTimeoutRef.current = setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000)
  }

  async function load() {
    const { data } = await supabase.from('testimonials').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (data) setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Revoga o objectURL do preview local quando o componente desmonta
  useEffect(() => {
    return () => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl) }
  }, [filePreviewUrl])

  // Limpa o timer do toast ao desmontar
  useEffect(() => {
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current) }
  }, [])

  // Extrai o filename do Storage a partir da URL pública pra poder chamar remove().
  // Retorna null se a URL não bate com o bucket 'testimonials'.
  function extractStoragePath(url: string | null | undefined): string | null {
    if (!url) return null
    const marker = '/storage/v1/object/public/testimonials/'
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(url.slice(idx + marker.length))
  }

  function clearSelectedFile() {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setFileError(null)
  }

  function validateMediaFile(file: File): string | null {
    if (!MEDIA_ACCEPTED_TYPES.includes(file.type)) {
      return 'Formato não suportado. Use JPG, PNG, WebP, MP4, MOV ou WebM.'
    }
    if (file.size > MEDIA_MAX_BYTES) {
      return 'Arquivo muito grande. Máximo 50MB.'
    }
    return null
  }

  function handleMediaFile(file: File) {
    const err = validateMediaFile(file)
    if (err) { setFileError(err); return }
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setSelectedFile(file)
    setFilePreviewUrl(URL.createObjectURL(file))
    setFileError(null)
  }

  function handleMediaDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    if (e.type === 'dragleave') setDragActive(false)
  }

  function handleMediaDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleMediaFile(f)
  }

  function openNew() {
    clearSelectedFile()
    setEditing({ ...EMPTY })
    setDialog(true)
  }
  function openEdit(t: Testimonial) {
    clearSelectedFile()
    setEditing({ ...t })
    setDialog(true)
  }
  function closeDialog() {
    clearSelectedFile()
    setDialog(false)
  }

  async function handleSave() {
    setSaving(true)
    setFileError(null)

    try {
      let mediaUrl = editing.media_url || null
      let mediaType = editing.media_type || null

      // Upload opcional — só roda se houver arquivo novo selecionado
      if (selectedFile) {
        setUploading(true)
        try {
          const fileExt = selectedFile.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('testimonials')
            .upload(fileName, selectedFile, { contentType: selectedFile.type })
          if (uploadError) {
            console.error('Erro no upload da mídia:', uploadError)
            setFileError('Falha ao enviar o arquivo: ' + uploadError.message)
            showToast('error', 'Falha ao enviar a mídia: ' + uploadError.message)
            return
          }
          const { data: pub } = supabase.storage.from('testimonials').getPublicUrl(fileName)
          // Remove a mídia antiga (se havia) APÓS o upload do novo dar certo
          const oldPath = extractStoragePath(editing.media_url)
          if (oldPath) {
            await supabase.storage.from('testimonials').remove([oldPath]).catch(err => {
              console.warn('Falha ao remover mídia antiga:', err)
            })
          }
          mediaUrl = pub.publicUrl
          mediaType = inferMediaType(selectedFile.type)
        } finally {
          setUploading(false)
        }
      }

      const payload = {
        student_name: editing.student_name, student_instagram: editing.student_instagram || null,
        content: editing.content,
        media_url: mediaUrl, media_type: mediaType,
        student_gender: editing.student_gender || null, student_fitness_level: editing.student_fitness_level || null,
        student_goal: editing.student_goal || null, student_context: editing.student_context || null,
        result_summary: editing.result_summary || null, source: editing.source || null,
        tags: editing.tags || [], is_active: true,
      }

      // Captura explícita do erro — sem isso, RLS/validation silenciosos somem
      const { error: dbError } = editing.id
        ? await supabase.from('testimonials').update(payload).eq('id', editing.id)
        : await supabase.from('testimonials').insert(payload)

      if (dbError) {
        // PostgrestError estende Error: message/code/details/hint NÃO são enumeráveis,
        // então console.error(err) imprime {}. Extraímos os campos manualmente.
        const e = dbError as unknown as { message?: string; code?: string; details?: string; hint?: string; name?: string }
        console.error('Erro ao salvar depoimento:', {
          message: e.message,
          code: e.code,
          details: e.details,
          hint: e.hint,
          name: e.name,
        })
        // JSON.stringify pra aparecer legível tanto no console quanto no overlay do Next (que serializa o primeiro arg como string)
        console.error('Payload rejeitado:', JSON.stringify(payload, null, 2))
        // Fallback em cascata — mensagens do supabase às vezes vêm em details/hint em vez de message
        const msg = e.message || e.details || e.hint || e.code || 'erro sem mensagem (verifique RLS e policies da tabela testimonials no Supabase)'
        showToast('error', 'Erro ao salvar: ' + msg)
        return
      }

      showToast('success', editing.id ? 'Depoimento atualizado' : 'Depoimento criado')
      clearSelectedFile()
      setDialog(false)
      load()
    } catch (err) {
      // Exception inesperada (network, JSON parse, etc) — último recurso
      console.error('Exception em handleSave:', err)
      showToast('error', 'Erro inesperado: ' + ((err as Error)?.message || 'tente novamente'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      // Remove o arquivo do Storage (se houver) antes de desativar o registro.
      // Se o remove falhar, segue com o soft-delete — o arquivo órfão não trava a operação.
      const item = items.find(i => i.id === id)
      const path = extractStoragePath(item?.media_url)
      if (path) {
        await supabase.storage.from('testimonials').remove([path]).catch(err => {
          console.warn('Falha ao remover mídia do storage:', err)
        })
      }
      const { error } = await supabase.from('testimonials').update({ is_active: false }).eq('id', id)
      if (error) {
        const e = error as unknown as { message?: string; code?: string; details?: string; hint?: string }
        console.error('Erro ao excluir depoimento:', {
          message: e.message, code: e.code, details: e.details, hint: e.hint,
        })
        const msg = e.message || e.details || e.hint || e.code || 'erro sem mensagem'
        showToast('error', 'Erro ao excluir: ' + msg)
        return
      }
      showToast('success', 'Depoimento excluído')
      setDeleteConfirm(null)
      load()
    } catch (err) {
      console.error('Exception em handleDelete:', err)
      showToast('error', 'Erro inesperado: ' + ((err as Error)?.message || 'tente novamente'))
    }
  }

  function addTag() {
    if (!tagInput.trim()) return
    setEditing(p => ({ ...p, tags: [...(p.tags || []), tagInput.trim()] }))
    setTagInput('')
  }

  const filtered = items.filter(t => {
    if (filterGender && t.student_gender !== filterGender) return false
    if (filterGoal && t.student_goal !== filterGoal) return false
    if (filterContext && !t.student_context?.toLowerCase().includes(filterContext.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Depoimentos</h2>
          <p className="text-[#414844] opacity-80 mt-1">
            <span className="font-semibold text-[#111827]">{items.length}</span> provas sociais segmentadas para follow-up
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#1B3A2D] text-white px-5 py-2.5 rounded-full text-[14px] font-bold hover:opacity-90 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Novo depoimento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <FilterDropdown label="Gênero" options={[{ value: 'F', label: 'Feminino' }, { value: 'M', label: 'Masculino' }]} value={filterGender} onChange={v => setFilterGender(v)} />
        <FilterDropdown label="Objetivo" options={[{ value: 'emagrecer', label: 'Emagrecer' }, { value: 'hipertrofia', label: 'Hipertrofia' }, { value: 'saude', label: 'Saúde' }, { value: 'performance', label: 'Performance' }]} value={filterGoal} onChange={v => setFilterGoal(v)} />
        <FilterDropdown label="Contexto" options={[{ value: 'mae', label: 'Mãe' }, { value: 'empresari', label: 'Empresário(a)' }, { value: 'estudante', label: 'Estudante' }, { value: 'sedentari', label: 'Sedentário(a)' }]} value={filterContext} onChange={v => setFilterContext(v)} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 skeleton-shimmer rounded-[16px]" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden group hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
              {/* Media header */}
              {t.media_url && t.media_type === 'video' && (
                <button
                  type="button"
                  onClick={() => setLightboxMedia({ url: t.media_url!, type: 'video' })}
                  className="relative h-[160px] overflow-hidden bg-[#F3F4F6] block w-full text-left"
                >
                  <video src={t.media_url} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 text-[#111827] ml-0.5" />
                    </div>
                  </div>
                </button>
              )}
              {t.media_url && t.media_type !== 'video' && (
                <button
                  type="button"
                  onClick={() => setLightboxMedia({ url: t.media_url!, type: 'image' })}
                  className="h-[160px] overflow-hidden bg-[#F3F4F6] block w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </button>
              )}

              <div className="p-6 flex-1 flex flex-col">
                {/* Name + @ + hover actions */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[15px] font-bold text-[#111827] truncate">{t.student_name}</h3>
                  {t.student_instagram && (
                    <a
                      href={`https://instagram.com/${t.student_instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-[11px] text-[#9CA3AF] hover:text-[#7A9E00] transition-colors flex-shrink-0"
                    >
                      @{t.student_instagram}
                    </a>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C0C7D0] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C0C7D0] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-all" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Testimonial text */}
                <p className="text-[13px] text-[#6B7280] leading-relaxed line-clamp-4 mb-4 flex-1">
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Result — unique color accent */}
                {t.result_summary && (
                  <div className="flex items-center gap-2 mb-4 py-2 border-t border-[#F3F4F6]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-[#111827]">{t.result_summary}</span>
                  </div>
                )}

                {/* Tags + source */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {t.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                    {t.tags.length > 3 && <span className="text-[10px] text-[#9CA3AF]">+{t.tags.length - 3}</span>}
                  </div>
                  {t.source && (
                    <span className="text-[10px] text-[#C0C7D0] flex-shrink-0">
                      via {t.source === 'instagram' ? 'Instagram' : t.source === 'whatsapp' ? 'WhatsApp' : t.source}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-16 text-center col-span-full">
              <div className="w-16 h-16 rounded-full bg-[#C8E645]/10 flex items-center justify-center mx-auto mb-4">
                <Award className="w-7 h-7 text-[#C8E645]" />
              </div>
              <h3 className="text-[16px] font-bold text-[#111827] mb-1">Nenhum depoimento</h3>
              <p className="text-[13px] text-[#9CA3AF] mb-4">Adicione provas sociais para usar nos follow-ups</p>
              <button onClick={openNew} className="px-5 py-2.5 bg-[#1B3A2D] text-white text-[13px] font-bold rounded-full hover:opacity-90 active:scale-95 transition-all">
                + Novo depoimento
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className={cn('[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[520px] max-h-[calc(100vh-48px)] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.15)]')}>
          <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
            <h3 className="text-[18px] font-bold text-[#111827]">{editing.id ? 'Editar depoimento' : 'Novo depoimento'}</h3>
            <button onClick={closeDialog} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors"><X className="w-4 h-4 text-[#9CA3AF]" /></button>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 dropdown-scroll px-6 pb-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Nome da aluna</label>
              <input value={editing.student_name || ''} onChange={e => setEditing(p => ({ ...p, student_name: e.target.value }))} placeholder="Ex: Ana Lucia"
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all" />
            </div>

            {/* Instagram */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">@ Instagram (opcional)</label>
              <div className="relative">
                <input value={editing.student_instagram || ''} onChange={e => setEditing(p => ({ ...p, student_instagram: e.target.value.replace('@', '') }))} placeholder="username_da_aluna"
                  className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 pl-8 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#C0C7D0]">@</span>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Depoimento</label>
              <textarea value={editing.content || ''} onChange={e => setEditing(p => ({ ...p, content: e.target.value }))} placeholder="O que a aluna disse..." rows={4}
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all resize-none" />
            </div>

            {/* Result */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Resultado conquistado</label>
              <div className="relative">
                <input value={editing.result_summary || ''} onChange={e => setEditing(p => ({ ...p, result_summary: e.target.value }))} placeholder="Ex: Perdeu 12kg em 4 meses"
                  className="w-full bg-[#10B981]/5 border-[1.5px] border-[#10B981]/20 rounded-[10px] px-4 py-3 pl-10 text-[14px] text-[#374151] placeholder-[#9CA3AF] focus:border-[#10B981] focus:ring-0 focus:outline-none focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)] transition-all" />
                <Trophy className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#059669]" />
              </div>
            </div>

            {/* Media upload */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Mídia (opcional)</label>
              {(() => {
                // 3 estados: arquivo novo selecionado · mídia já existente (edição) · vazio
                const hasNewFile = !!(selectedFile && filePreviewUrl)
                const hasExistingMedia = !hasNewFile && !!editing.media_url
                const previewUrl = hasNewFile ? filePreviewUrl! : editing.media_url
                const previewType = hasNewFile
                  ? inferMediaType(selectedFile!.type)
                  : (editing.media_type || 'image')

                if (hasNewFile || hasExistingMedia) {
                  return (
                    <div className="rounded-[12px] border border-[#EFEFEF] bg-[#F7F8F9] overflow-hidden">
                      <div className="relative aspect-video bg-[#F3F4F6]">
                        {previewType === 'video' ? (
                          <video
                            src={previewUrl || undefined}
                            className="w-full h-full object-contain bg-black"
                            controls
                            preload="metadata"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl || ''} alt="preview" className="w-full h-full object-contain" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 bg-white border-t border-[#EFEFEF]">
                        <div className="w-8 h-8 rounded-[8px] bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                          {previewType === 'video' ? (
                            <Film className="w-4 h-4 text-[#6B7280]" />
                          ) : (
                            <ImagePlus className="w-4 h-4 text-[#6B7280]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#111827] truncate">
                            {hasNewFile ? selectedFile!.name : 'Mídia atual'}
                          </p>
                          <p className="text-[11px] text-[#9CA3AF]">
                            {hasNewFile ? formatMediaSize(selectedFile!.size) : 'Envie um novo arquivo pra substituir'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[12px] font-semibold text-[#6B7280] hover:text-[#111827] px-3 py-1.5 rounded-full hover:bg-[#F3F4F6] transition-all"
                        >
                          Trocar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearSelectedFile()
                            if (hasExistingMedia) {
                              setEditing(p => ({ ...p, media_url: '', media_type: null }))
                            }
                          }}
                          className="w-8 h-8 rounded-full hover:bg-[#FEF2F2] flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] transition-all flex-shrink-0"
                          title="Remover"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={MEDIA_ACCEPTED_EXT}
                        onChange={e => { if (e.target.files?.[0]) handleMediaFile(e.target.files[0]); e.target.value = '' }}
                        className="hidden"
                      />
                    </div>
                  )
                }

                return (
                  <div
                    onDragEnter={handleMediaDrag}
                    onDragLeave={handleMediaDrag}
                    onDragOver={handleMediaDrag}
                    onDrop={handleMediaDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'relative border-[2px] border-dashed rounded-[12px] px-4 py-6 text-center cursor-pointer transition-all',
                      dragActive
                        ? 'border-[#C8E645] bg-[#C8E645]/5'
                        : 'border-[#E5E7EB] hover:border-[#C8E645]/40 hover:bg-[#FAFBFC]'
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={MEDIA_ACCEPTED_EXT}
                      onChange={e => { if (e.target.files?.[0]) handleMediaFile(e.target.files[0]); e.target.value = '' }}
                      className="hidden"
                    />
                    <div className={cn(
                      'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center transition-colors',
                      dragActive ? 'bg-[#C8E645]/20' : 'bg-[#F3F4F6]'
                    )}>
                      <ImagePlus className={cn('w-5 h-5', dragActive ? 'text-[#7A9E00]' : 'text-[#9CA3AF]')} />
                    </div>
                    <p className="text-[13px] font-semibold text-[#111827]">
                      {dragActive ? 'Solte o arquivo aqui' : 'Clique ou arraste uma imagem/vídeo'}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-1">
                      JPG, PNG, WebP, MP4, MOV, WebM · até 50MB
                    </p>
                  </div>
                )
              })()}
              {fileError && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#EF4444]">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fileError}
                </p>
              )}
            </div>

            {/* Classification */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Gênero <span className="text-[#EF4444]">*</span></label>
                <InlineSelect
                  value={editing.student_gender || ''}
                  onChange={v => setEditing(p => ({ ...p, student_gender: v || null }))}
                  options={[
                    { value: 'F', label: 'Feminino' },
                    { value: 'M', label: 'Masculino' },
                  ]}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Nível</label>
                <InlineSelect
                  value={editing.student_fitness_level || ''}
                  onChange={v => setEditing(p => ({ ...p, student_fitness_level: v || null }))}
                  options={[
                    { value: 'sedentario', label: 'Sedentário' },
                    { value: 'iniciante', label: 'Iniciante' },
                    { value: 'intermediario', label: 'Intermediário' },
                    { value: 'avancado', label: 'Avançado' },
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Objetivo <span className="text-[#EF4444]">*</span></label>
                <InlineSelect
                  value={editing.student_goal || ''}
                  onChange={v => setEditing(p => ({ ...p, student_goal: v || null }))}
                  options={[
                    { value: 'emagrecer', label: 'Emagrecer' },
                    { value: 'hipertrofia', label: 'Hipertrofia' },
                    { value: 'saude', label: 'Saúde' },
                    { value: 'performance', label: 'Performance' },
                  ]}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Contexto <span className="text-[11px] font-normal normal-case tracking-normal text-[#7A9E00]">(recomendado pra IA)</span></label>
                <input value={editing.student_context || ''} onChange={e => setEditing(p => ({ ...p, student_context: e.target.value || null }))} placeholder="mãe, empresária..."
                  className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-3 py-3 text-[13px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none transition-all" />
              </div>
            </div>

            {/* Source */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Origem do depoimento</label>
              <InlineSelect
                value={editing.source || ''}
                onChange={v => setEditing(p => ({ ...p, source: v || null }))}
                placeholder="Selecionar origem"
                options={[
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'presencial', label: 'Presencial' },
                  { value: 'manual', label: 'Manual' },
                ]}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(editing.tags || []).map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#374151] bg-[#F3F4F6] px-2.5 py-1 rounded-full">
                    {tag}
                    <button onClick={() => setEditing(p => ({ ...p, tags: (p.tags || []).filter(t => t !== tag) }))} className="text-[#9CA3AF] hover:text-[#EF4444] transition-colors"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Adicionar tag..."
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  className="flex-1 bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-full px-4 py-2.5 text-[13px] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none transition-all" />
                <button onClick={addTag} className="w-9 h-9 rounded-full bg-[#C8E645] flex items-center justify-center hover:bg-[#AECF1E] active:scale-95 transition-all">
                  <Plus className="w-4 h-4 text-[#111827]" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#F3F4F6] px-6 py-4 flex-shrink-0">
            {!!(editing.student_name?.trim() || editing.content?.trim()) && !(editing.student_gender && editing.student_goal) && (
              <div className="flex items-start gap-2 mb-3 p-3 bg-[#F59E0B]/5 rounded-[10px] border border-[#F59E0B]/10">
                <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#D97706] leading-relaxed">
                  Preencha <strong>gênero</strong> e <strong>objetivo</strong> pra IA conseguir usar este depoimento automaticamente nas conversas com leads de perfil similar.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={closeDialog} disabled={saving || uploading} className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all disabled:opacity-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || uploading || !editing.student_name?.trim() || !editing.content?.trim() || !editing.student_gender || !editing.student_goal}
                className={cn('flex-1 py-3 rounded-full text-[14px] font-bold transition-all flex items-center justify-center gap-2',
                  editing.student_name?.trim() && editing.content?.trim() && editing.student_gender && editing.student_goal && !saving && !uploading
                    ? 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]'
                    : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed')}>
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando mídia...</> : saving ? 'Salvando...' : editing.id ? 'Salvar alterações' : 'Criar depoimento'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox de mídia — abre ao clicar no thumbnail do card */}
      <Dialog open={!!lightboxMedia} onOpenChange={open => { if (!open) setLightboxMedia(null) }}>
        <DialogContent className="[&>button]:hidden bg-black/95 rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[760px] max-h-[calc(100vh-48px)] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <button
            onClick={() => setLightboxMedia(null)}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          {lightboxMedia?.type === 'video' ? (
            <video src={lightboxMedia.url} className="w-full max-h-[calc(100vh-96px)] bg-black" controls autoPlay />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightboxMedia?.url || ''} alt="" className="w-full max-h-[calc(100vh-96px)] object-contain" />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="[&>button]:hidden bg-white rounded-[20px] p-6 w-[380px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] text-center">
          <div className="w-14 h-14 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-[#EF4444]" />
          </div>
          <h3 className="text-[18px] font-bold text-[#111827] mb-1">Excluir depoimento?</h3>
          <p className="text-[13px] text-[#6B7280] mb-6">Essa ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] transition-all">Cancelar</button>
            <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="flex-1 py-3 bg-[#EF4444] text-white rounded-full text-[14px] font-bold hover:bg-[#DC2626] active:scale-[0.98] transition-all">Excluir</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast — feedback de operação (success / error) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-6 right-6 flex items-start gap-2 text-white text-[13px] font-medium px-4 py-3 rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] animate-dropdown-in z-50 max-w-[380px]',
            toast.type === 'error' ? 'bg-[#EF4444]' : 'bg-[#111827]',
          )}
        >
          {toast.type === 'error'
            ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <Check className="w-4 h-4 text-[#C8E645] flex-shrink-0 mt-0.5" />
          }
          <span className="flex-1 leading-relaxed">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
