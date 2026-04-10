'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, X, Star } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import type { Testimonial } from '@/lib/types'

const EMPTY: Partial<Testimonial> = {
  student_name: '', content: '', media_url: '', media_type: null,
  student_gender: null, student_fitness_level: null, student_goal: null,
  student_context: null, result_summary: null, tags: [], is_active: true,
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

  // Filters
  const [filterGender, setFilterGender] = useState('')
  const [filterGoal, setFilterGoal] = useState('')

  async function load() {
    const { data } = await supabase.from('testimonials').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (data) setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing({ ...EMPTY })
    setDialog(true)
  }

  function openEdit(t: Testimonial) {
    setEditing({ ...t })
    setDialog(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      student_name: editing.student_name,
      content: editing.content,
      media_url: editing.media_url || null,
      media_type: editing.media_type || null,
      student_gender: editing.student_gender || null,
      student_fitness_level: editing.student_fitness_level || null,
      student_goal: editing.student_goal || null,
      student_context: editing.student_context || null,
      result_summary: editing.result_summary || null,
      tags: editing.tags || [],
      is_active: true,
    }

    if (editing.id) {
      await supabase.from('testimonials').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('testimonials').insert(payload)
    }

    setSaving(false)
    setDialog(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('testimonials').update({ is_active: false }).eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  const filtered = items.filter(t => {
    if (filterGender && t.student_gender !== filterGender) return false
    if (filterGoal && t.student_goal !== filterGoal) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Depoimentos</h1>
          <p className="text-muted-foreground text-sm">Banco de provas sociais segmentadas</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filterGender} onChange={e => setFilterGender(e.target.value)}>
          <option value="">Todos gêneros</option>
          <option value="M">Masculino</option><option value="F">Feminino</option>
        </Select>
        <Select value={filterGoal} onChange={e => setFilterGoal(e.target.value)}>
          <option value="">Todos objetivos</option>
          <option value="emagrecer">Emagrecer</option><option value="hipertrofia">Hipertrofia</option>
          <option value="saude">Saúde</option><option value="performance">Performance</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-48" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <Card key={t.id} className="hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardContent className="p-4 space-y-2">
                {t.media_url && (
                  <div className="rounded-md overflow-hidden bg-muted h-32">
                    {t.media_type === 'video' ? (
                      <video src={t.media_url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={t.media_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <p className="font-medium text-sm">{t.student_name}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{t.content}</p>
                {t.result_summary && <p className="text-xs font-medium text-primary">{t.result_summary}</p>}
                <div className="flex flex-wrap gap-1">
                  {t.tags.map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(t.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="col-span-full"><EmptyState icon={Star} title="Nenhum depoimento" description="Adicione depoimentos de alunos para usar como prova social." /></div>}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent onClose={() => setDialog(false)} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? 'Editar' : 'Novo'} Depoimento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome da aluna" value={editing.student_name || ''} onChange={e => setEditing(p => ({ ...p, student_name: e.target.value }))} />
            <Textarea placeholder="Texto do depoimento" value={editing.content || ''} onChange={e => setEditing(p => ({ ...p, content: e.target.value }))} rows={4} />
            <Input placeholder="URL da mídia (imagem ou vídeo)" value={editing.media_url || ''} onChange={e => setEditing(p => ({ ...p, media_url: e.target.value }))} />
            <Select value={editing.media_type || ''} onChange={e => setEditing(p => ({ ...p, media_type: e.target.value || null }))}>
              <option value="">Tipo de mídia</option><option value="image">Imagem</option><option value="video">Vídeo</option>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select value={editing.student_gender || ''} onChange={e => setEditing(p => ({ ...p, student_gender: e.target.value || null }))}>
                <option value="">Gênero</option><option value="M">Masculino</option><option value="F">Feminino</option>
              </Select>
              <Select value={editing.student_fitness_level || ''} onChange={e => setEditing(p => ({ ...p, student_fitness_level: e.target.value || null }))}>
                <option value="">Nível</option><option value="sedentario">Sedentário</option><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option>
              </Select>
              <Select value={editing.student_goal || ''} onChange={e => setEditing(p => ({ ...p, student_goal: e.target.value || null }))}>
                <option value="">Objetivo</option><option value="emagrecer">Emagrecer</option><option value="hipertrofia">Hipertrofia</option><option value="saude">Saúde</option><option value="performance">Performance</option>
              </Select>
              <Input placeholder="Contexto (mãe, estudante...)" value={editing.student_context || ''} onChange={e => setEditing(p => ({ ...p, student_context: e.target.value || null }))} />
            </div>
            <Input placeholder="Resultado (ex: perdeu 10kg em 3 meses)" value={editing.result_summary || ''} onChange={e => setEditing(p => ({ ...p, result_summary: e.target.value || null }))} />
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-1">
              {(editing.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button onClick={() => setEditing(p => ({ ...p, tags: (p.tags || []).filter(t => t !== tag) }))} className="cursor-pointer"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tag" className="h-8 text-xs"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { setEditing(p => ({ ...p, tags: [...(p.tags || []), tagInput.trim()] })); setTagInput('') } } }} />
              <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={() => { if (tagInput.trim()) { setEditing(p => ({ ...p, tags: [...(p.tags || []), tagInput.trim()] })); setTagInput('') } }}>+</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !editing.student_name?.trim()}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent onClose={() => setDeleteConfirm(null)}>
          <DialogHeader><DialogTitle>Excluir depoimento?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
