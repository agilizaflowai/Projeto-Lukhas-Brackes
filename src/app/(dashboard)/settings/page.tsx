'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Save, Plus, Trash2, X, ShieldAlert } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import type { AIConfig } from '@/lib/types'

export default function SettingsPage() {
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()
  const [configs, setConfigs] = useState<AIConfig[]>([])
  const [loading, setLoading] = useState(true)

  // Personality
  const [personality, setPersonality] = useState('')
  // Protocol
  const [protocol, setProtocol] = useState('')
  // Banned words
  const [bannedWords, setBannedWords] = useState<AIConfig[]>([])
  const [newWord, setNewWord] = useState('')
  // Examples
  const [examples, setExamples] = useState<AIConfig[]>([])
  const [newExample, setNewExample] = useState('')

  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('ai_config').select('*').eq('is_active', true).order('created_at', { ascending: true })
    if (data) {
      setConfigs(data)
      const p = data.find(c => c.config_type === 'personality')
      setPersonality(p?.config_value || '')
      const pr = data.find(c => c.config_type === 'sales_protocol')
      setProtocol(pr?.config_value || '')
      setBannedWords(data.filter(c => c.config_type === 'banned_words'))
      setExamples(data.filter(c => c.config_type === 'example_conversation'))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveText(configType: string, value: string) {
    setSaving(true)
    const existing = configs.find(c => c.config_type === configType)
    if (existing) {
      await supabase.from('ai_config').update({ config_value: value }).eq('id', existing.id)
    } else {
      await supabase.from('ai_config').insert({ config_type: configType, config_key: configType, config_value: value, is_active: true })
    }
    setSaving(false)
    load()
  }

  async function addBannedWord() {
    if (!newWord.trim()) return
    await supabase.from('ai_config').insert({ config_type: 'banned_words', config_key: newWord.trim(), config_value: newWord.trim(), is_active: true })
    setNewWord('')
    load()
  }

  async function removeBannedWord(id: string) {
    await supabase.from('ai_config').update({ is_active: false }).eq('id', id)
    load()
  }

  async function addExample() {
    if (!newExample.trim()) return
    await supabase.from('ai_config').insert({ config_type: 'example_conversation', config_key: `example_${Date.now()}`, config_value: newExample, is_active: true })
    setNewExample('')
    load()
  }

  async function removeExample(id: string) {
    await supabase.from('ai_config').update({ is_active: false }).eq('id', id)
    load()
  }

  async function updateExample(id: string, value: string) {
    await supabase.from('ai_config').update({ config_value: value }).eq('id', id)
  }

  if (profileLoading || loading) {
    return <div className="space-y-4"><Skeleton className="skeleton-shimmer h-10 w-48" /><Skeleton className="skeleton-shimmer h-96" /></div>
  }

  if (profile?.role !== 'admin') {
    return (
      <EmptyState icon={ShieldAlert} title="Acesso restrito" description="Acesso restrito a administradores" />
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>Configurações da IA</h1>
      <p className="text-muted-foreground mb-4">Personalize o comportamento do agente</p>

      <Tabs defaultValue="personality">
        <TabsList>
          <TabsTrigger value="personality">Personalidade</TabsTrigger>
          <TabsTrigger value="banned">Palavras Proibidas</TabsTrigger>
          <TabsTrigger value="examples">Exemplos</TabsTrigger>
          <TabsTrigger value="protocol">Protocolo</TabsTrigger>
        </TabsList>

        <TabsContent value="personality">
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">Descreva como a IA deve se comportar nas conversas</p>
              <Textarea value={personality} onChange={e => setPersonality(e.target.value)} rows={12} placeholder="Ex: Você é o Lukhas, personal trainer descontraído..." />
              <Button onClick={() => saveText('personality', personality)} disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banned">
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">Palavras que a IA nunca deve usar</p>
              <div className="flex flex-wrap gap-2">
                {bannedWords.map(w => (
                  <span key={w.id} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
                    {w.config_value}
                    <button onClick={() => removeBannedWord(w.id)} className="hover:text-destructive cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Nova palavra"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBannedWord() } }} />
                <Button onClick={addBannedWord} disabled={!newWord.trim()}><Plus className="w-4 h-4" /> Adicionar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples">
          <Card>
            <CardContent className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">Exemplos de conversa para a IA aprender o estilo</p>
              {examples.map(ex => (
                <div key={ex.id} className="space-y-2 p-3 rounded-lg border">
                  <Textarea defaultValue={ex.config_value} onBlur={e => updateExample(ex.id, e.target.value)} rows={4} />
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeExample(ex.id)}>
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </Button>
                </div>
              ))}
              <div className="space-y-2 p-3 rounded-lg border border-dashed">
                <Textarea value={newExample} onChange={e => setNewExample(e.target.value)} rows={4} placeholder="Cole aqui um exemplo de conversa..." />
                <Button onClick={addExample} disabled={!newExample.trim()}><Plus className="w-4 h-4" /> Adicionar exemplo</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protocol">
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">Protocolo de vendas (Social Selling + SPIN)</p>
              <Textarea value={protocol} onChange={e => setProtocol(e.target.value)} rows={12} placeholder="Descreva o protocolo de vendas passo a passo..." />
              <Button onClick={() => saveText('sales_protocol', protocol)} disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
