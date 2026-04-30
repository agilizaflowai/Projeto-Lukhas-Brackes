'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Save, Plus, Trash2, X, ShieldAlert, Sparkles, Ban,
  MessageSquare, FileText, Check, Info, Loader2,
  GraduationCap, Upload, Film, Mic, Brain, CheckCircle, XCircle, Clock, ChevronDown, AlertTriangle,
  Phone, Layers, Users as UsersIcon, Pencil, KeyRound, UserX, UserCheck, Shield,
} from 'lucide-react'
import bcrypt from 'bcryptjs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AIConfig } from '@/lib/types'

type TabId = 'personality' | 'banned' | 'examples' | 'protocol' | 'mentor' | 'voice' | 'users'

const TABS: { id: TabId; label: string; icon: typeof Sparkles; adminOnly?: boolean }[] = [
  { id: 'personality', label: 'Personalidade', icon: Sparkles },
  { id: 'banned', label: 'Palavras Proibidas', icon: Ban },
  { id: 'examples', label: 'Exemplos', icon: MessageSquare },
  { id: 'protocol', label: 'Protocolo', icon: FileText },
  { id: 'mentor', label: 'Material do Mentor', icon: GraduationCap },
  { id: 'voice', label: 'Clone de Voz', icon: Mic },
  { id: 'users', label: 'Usuários', icon: UsersIcon, adminOnly: true },
]

interface AppUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'operator'
  is_active: boolean
  created_at: string
}

type UserDialogMode = 'create' | 'edit' | 'password' | null
type UserActionType = 'delete' | 'deactivate' | 'activate'

interface MentorMaterial {
  id: string
  file_name: string
  file_size: number
  status: 'uploading' | 'transcribing' | 'extracting' | 'ready' | 'error'
  content_preview: string | null
  duration_seconds: number | null
  storage_path: string | null
  uploaded_at: string
  config_type?: string
}

const ACCEPTED_FILE_TYPES = [
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/webm',
  'video/mp4', 'video/quicktime', 'video/webm',
]
const ACCEPTED_EXTENSIONS = '.mp3,.mp4,.m4a,.wav,.webm,.mov'
const MAX_FILE_SIZE = 25 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getMaterialStatusConfig(status: string) {
  switch (status) {
    case 'uploading': return { label: 'Enviando', color: 'bg-[#3B82F6]/10 text-[#2563EB]', Icon: Upload, animate: true }
    case 'transcribing': return { label: 'Transcrevendo', color: 'bg-[#F59E0B]/10 text-[#D97706]', Icon: Mic, animate: true }
    case 'extracting': return { label: 'Extraindo conteúdo', color: 'bg-[#8B5CF6]/10 text-[#7C3AED]', Icon: Brain, animate: true }
    case 'ready': return { label: 'Pronto', color: 'bg-[#10B981]/10 text-[#059669]', Icon: CheckCircle, animate: false }
    case 'error': return { label: 'Erro', color: 'bg-[#EF4444]/10 text-[#DC2626]', Icon: XCircle, animate: false }
    default: return { label: status, color: 'bg-[#6B7280]/10 text-[#4B5563]', Icon: Clock, animate: false }
  }
}

const BANNED_SUGGESTIONS = ['preço', 'valor', 'promoção', 'desconto', 'barato', 'garantia', 'reembolso', 'dieta', 'prescrever', 'treino']

export default function SettingsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const supabase = createClient()
  const [configs, setConfigs] = useState<AIConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('personality')

  const [personality, setPersonality] = useState('')
  const [originalPersonality, setOriginalPersonality] = useState('')
  const [protocol, setProtocol] = useState('')
  const [originalProtocol, setOriginalProtocol] = useState('')
  // Guardrail: limite diário de mensagens que a IA pode enviar por lead
  const [maxDailyAIMessages, setMaxDailyAIMessages] = useState('20')
  const [originalMaxDailyAIMessages, setOriginalMaxDailyAIMessages] = useState('20')
  const [savingGuardrails, setSavingGuardrails] = useState(false)
  const [bannedWords, setBannedWords] = useState<AIConfig[]>([])
  const [newWord, setNewWord] = useState('')
  const [examples, setExamples] = useState<AIConfig[]>([])
  const [newExample, setNewExample] = useState('')

  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Voice clone state
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceId, setVoiceId] = useState('')
  const [voiceEndpoint, setVoiceEndpoint] = useState('')
  const [savingVoice, setSavingVoice] = useState(false)

  // Mentor material state
  const [materialType, setMaterialType] = useState<'dm' | 'calls' | 'ambos' | ''>('')
  const [materials, setMaterials] = useState<MentorMaterial[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null)
  const [deleteMaterialConfirm, setDeleteMaterialConfirm] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Users management state
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userDialogMode, setUserDialogMode] = useState<UserDialogMode>(null)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'operator' as 'admin' | 'operator' })
  const [savingUser, setSavingUser] = useState(false)
  const [userFormError, setUserFormError] = useState<string | null>(null)
  const [userActionConfirm, setUserActionConfirm] = useState<{ type: UserActionType; user: AppUser } | null>(null)
  const [userActionBusy, setUserActionBusy] = useState(false)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    const { data } = await supabase.from('ai_config').select('*').eq('is_active', true).order('created_at', { ascending: true })
    if (data) {
      setConfigs(data)
      const p = data.find(c => c.config_type === 'personality')
      const pVal = p?.config_value || ''
      setPersonality(pVal)
      setOriginalPersonality(pVal)
      const pr = data.find(c => c.config_type === 'sales_protocol')
      const prVal = pr?.config_value || ''
      setProtocol(prVal)
      setOriginalProtocol(prVal)
      const g = data.find(c => c.config_type === 'guardrails' && c.config_key === 'max_daily_ai_messages')
      const gVal = g?.config_value || '20'
      setMaxDailyAIMessages(gVal)
      setOriginalMaxDailyAIMessages(gVal)
      setBannedWords(data.filter(c => c.config_type === 'banned_words'))
      setExamples(data.filter(c => c.config_type === 'example_conversation'))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveText(configType: string, value: string, label: string) {
    setSaving(true)
    const existing = configs.find(c => c.config_type === configType)
    if (existing) {
      await supabase.from('ai_config').update({ config_value: value }).eq('id', existing.id)
    } else {
      await supabase.from('ai_config').insert({ config_type: configType, config_key: configType, config_value: value, is_active: true })
    }
    setSaving(false)
    setLastSaved(new Date())
    showToast(`${label} salvo com sucesso`)
    load()
  }

  async function saveGuardrail() {
    const num = parseInt(maxDailyAIMessages, 10)
    if (isNaN(num) || num < 1 || num > 50) {
      showToast('O limite deve ser entre 1 e 50')
      return
    }
    setSavingGuardrails(true)
    const value = String(num)
    const existing = configs.find(c => c.config_type === 'guardrails' && c.config_key === 'max_daily_ai_messages')
    if (existing) {
      await supabase.from('ai_config').update({ config_value: value }).eq('id', existing.id)
    } else {
      await supabase.from('ai_config').insert({
        config_type: 'guardrails',
        config_key: 'max_daily_ai_messages',
        config_value: value,
        is_active: true,
      })
    }
    setSavingGuardrails(false)
    setLastSaved(new Date())
    setMaxDailyAIMessages(value)
    setOriginalMaxDailyAIMessages(value)
    showToast('Limite diário salvo com sucesso')
    load()
  }

  // ═══ USERS MANAGEMENT ═══

  async function loadUsers() {
    setUsersLoading(true)
    const { data, error } = await supabase
      .from('app_users')
      .select('id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Erro ao carregar usuários:', error)
      showToast('Erro ao carregar usuários')
    } else if (data) {
      setUsers(data as AppUser[])
    }
    setUsersLoading(false)
  }

  function activeAdminCount(): number {
    return users.filter(u => u.role === 'admin' && u.is_active).length
  }

  function isSelf(u: AppUser): boolean {
    return user?.id === u.id
  }

  function openCreateUser() {
    setEditingUser(null)
    setUserForm({ name: '', email: '', password: '', confirmPassword: '', role: 'operator' })
    setUserFormError(null)
    setUserDialogMode('create')
  }

  function openEditUser(u: AppUser) {
    setEditingUser(u)
    setUserForm({ name: u.name, email: u.email, password: '', confirmPassword: '', role: u.role })
    setUserFormError(null)
    setUserDialogMode('edit')
  }

  function openResetPassword(u: AppUser) {
    setEditingUser(u)
    setUserForm({ name: u.name, email: u.email, password: '', confirmPassword: '', role: u.role })
    setUserFormError(null)
    setUserDialogMode('password')
  }

  function closeUserDialog() {
    setUserDialogMode(null)
    setEditingUser(null)
    setUserFormError(null)
    setUserForm({ name: '', email: '', password: '', confirmPassword: '', role: 'operator' })
  }

  async function handleCreateUser() {
    const name = userForm.name.trim()
    const email = userForm.email.toLowerCase().trim()
    const password = userForm.password
    if (!name || !email || !password) {
      setUserFormError('Preencha todos os campos')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setUserFormError('Email inválido')
      return
    }
    if (password.length < 6) {
      setUserFormError('Senha precisa ter pelo menos 6 caracteres')
      return
    }
    setSavingUser(true)
    setUserFormError(null)
    try {
      // Verifica unicidade de email
      const { data: existing } = await supabase.from('app_users').select('id').eq('email', email).maybeSingle()
      if (existing) {
        setUserFormError('Esse email já está cadastrado')
        setSavingUser(false)
        return
      }
      const passwordHash = await bcrypt.hash(password, 10)
      const { error } = await supabase.from('app_users').insert({
        email, name, password_hash: passwordHash, role: userForm.role, is_active: true,
      })
      if (error) {
        const e = error as unknown as { message?: string; details?: string; hint?: string; code?: string }
        console.error('Erro ao criar usuário:', { message: e.message, code: e.code, details: e.details, hint: e.hint })
        setUserFormError(e.message || e.details || 'Erro ao criar usuário')
        setSavingUser(false)
        return
      }
      closeUserDialog()
      showToast('Usuário criado com sucesso')
      loadUsers()
    } catch (err) {
      console.error('Exception em handleCreateUser:', err)
      setUserFormError('Erro inesperado: ' + ((err as Error)?.message || 'tente novamente'))
    } finally {
      setSavingUser(false)
    }
  }

  async function handleUpdateUser() {
    if (!editingUser) return
    const name = userForm.name.trim()
    const email = userForm.email.toLowerCase().trim()
    if (!name || !email) {
      setUserFormError('Preencha todos os campos')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setUserFormError('Email inválido')
      return
    }
    // Se está removendo o próprio admin, bloqueia
    if (isSelf(editingUser) && editingUser.role === 'admin' && userForm.role !== 'admin') {
      setUserFormError('Você não pode remover seu próprio acesso de admin')
      return
    }
    // Se é o último admin ativo e está sendo despromovido
    if (editingUser.role === 'admin' && userForm.role !== 'admin' && activeAdminCount() === 1) {
      setUserFormError('Precisa existir pelo menos 1 admin ativo')
      return
    }
    setSavingUser(true)
    setUserFormError(null)
    try {
      if (email !== editingUser.email) {
        const { data: existing } = await supabase.from('app_users').select('id').eq('email', email).neq('id', editingUser.id).maybeSingle()
        if (existing) {
          setUserFormError('Esse email já está cadastrado')
          setSavingUser(false)
          return
        }
      }
      const { error } = await supabase.from('app_users').update({ name, email, role: userForm.role }).eq('id', editingUser.id)
      if (error) {
        const e = error as unknown as { message?: string; details?: string }
        setUserFormError(e.message || e.details || 'Erro ao salvar')
        setSavingUser(false)
        return
      }
      closeUserDialog()
      showToast('Usuário atualizado')
      loadUsers()
    } finally {
      setSavingUser(false)
    }
  }

  async function handleResetPassword() {
    if (!editingUser) return
    if (userForm.password.length < 6) {
      setUserFormError('Senha precisa ter pelo menos 6 caracteres')
      return
    }
    if (userForm.password !== userForm.confirmPassword) {
      setUserFormError('As senhas não coincidem')
      return
    }
    setSavingUser(true)
    setUserFormError(null)
    try {
      const passwordHash = await bcrypt.hash(userForm.password, 10)
      const { error } = await supabase.from('app_users').update({ password_hash: passwordHash }).eq('id', editingUser.id)
      if (error) {
        const e = error as unknown as { message?: string; details?: string }
        setUserFormError(e.message || e.details || 'Erro ao salvar')
        setSavingUser(false)
        return
      }
      closeUserDialog()
      showToast('Senha alterada com sucesso')
    } finally {
      setSavingUser(false)
    }
  }

  async function handleUserAction() {
    if (!userActionConfirm) return
    const { type, user: target } = userActionConfirm
    if (isSelf(target)) {
      showToast('Você não pode executar essa ação em si mesmo')
      setUserActionConfirm(null)
      return
    }
    // Última admin ativa protegida
    if ((type === 'deactivate' || type === 'delete') && target.role === 'admin' && target.is_active && activeAdminCount() === 1) {
      showToast('Precisa existir pelo menos 1 admin ativo')
      setUserActionConfirm(null)
      return
    }
    setUserActionBusy(true)
    try {
      if (type === 'delete') {
        const { error } = await supabase.from('app_users').delete().eq('id', target.id)
        if (error) { showToast('Erro: ' + (error.message || 'falha ao excluir')); return }
        showToast('Usuário excluído')
      } else {
        const nextActive = type === 'activate'
        const { error } = await supabase.from('app_users').update({ is_active: nextActive }).eq('id', target.id)
        if (error) { showToast('Erro: ' + (error.message || 'falha ao salvar')); return }
        showToast(nextActive ? 'Usuário ativado' : 'Usuário desativado')
      }
      setUserActionConfirm(null)
      loadUsers()
    } finally {
      setUserActionBusy(false)
    }
  }

  async function addBannedWord() {
    const word = newWord.trim()
    if (!word) return
    if (bannedWords.some(w => w.config_value.toLowerCase() === word.toLowerCase())) return
    await supabase.from('ai_config').insert({ config_type: 'banned_words', config_key: word, config_value: word, is_active: true })
    setNewWord('')
    showToast(`"${word}" adicionada`)
    load()
  }

  async function addBannedWordDirect(word: string) {
    if (bannedWords.some(w => w.config_value.toLowerCase() === word.toLowerCase())) return
    await supabase.from('ai_config').insert({ config_type: 'banned_words', config_key: word, config_value: word, is_active: true })
    showToast(`"${word}" adicionada`)
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
    showToast('Exemplo adicionado')
    load()
  }

  async function removeExample(id: string) {
    await supabase.from('ai_config').update({ is_active: false }).eq('id', id)
    load()
  }

  async function updateExample(id: string, value: string) {
    setExamples(prev => prev.map(e => e.id === id ? { ...e, config_value: value } : e))
  }

  async function saveExample(id: string) {
    const ex = examples.find(e => e.id === id)
    if (!ex) return
    await supabase.from('ai_config').update({ config_value: ex.config_value }).eq('id', id)
    setLastSaved(new Date())
    showToast('Exemplo salvo')
  }

  // ═══ Mentor material functions ═══

  async function loadMaterials() {
    const { data } = await supabase
      .from('ai_config')
      .select('*')
      .in('config_type', ['mentor_material_dm', 'mentor_material_calls'])
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setMaterials((data || []).map(d => {
      let meta: any = {}
      try { meta = JSON.parse(d.config_key || '{}') } catch {}
      return {
        id: d.id,
        file_name: meta.file_name || d.config_key || 'Material',
        file_size: meta.file_size || 0,
        status: meta.status || 'ready',
        content_preview: d.config_value,
        duration_seconds: meta.duration_seconds || null,
        storage_path: meta.storage_path || null,
        uploaded_at: d.created_at,
        config_type: d.config_type,
      }
    }))
  }

  function validateFile(file: File): string | null {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) return 'Formato não suportado. Use MP3, MP4, M4A, WAV, WebM ou MOV.'
    if (file.size > MAX_FILE_SIZE) return 'Arquivo muito grande. Máximo 25MB.'
    return null
  }

  function handleVideoFile(file: File) {
    const err = validateFile(file)
    if (err) { setUploadError(err); return }
    setUploadError('')
    setUploadFile(file)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleVideoFile(e.dataTransfer.files[0])
  }, [])

  async function handleUpload() {
    if (!uploadFile) return
    if (!materialType) {
      setUploadError('Selecione o tipo de material antes de enviar')
      return
    }
    setUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 8, 85))
      }, 400)

      const fileName = `${Date.now()}_${uploadFile.name}`
      const { error: uploadErr } = await supabase.storage
        .from('mentor-videos')
        .upload(fileName, uploadFile)

      clearInterval(progressInterval)

      if (uploadErr) throw uploadErr
      setUploadProgress(90)

      // Webhook n8n
      try {
        await fetch('https://n8n-gend.srv1431760.hstgr.cloud/webhook/mentor-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: uploadFile.name,
            storage_path: `mentor-videos/${fileName}`,
            uploaded_by: user?.name || 'lukhas',
            material_type: materialType,
          })
        })
      } catch {
        console.warn('Webhook falhou, mas arquivo foi salvo')
      }

      setUploadProgress(100)
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
        setUploadFile(null)
        setMaterialType('')
        loadMaterials()
        showToast('Material enviado! Processamento iniciado.')
      }, 500)
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError('Erro ao enviar arquivo. Tente novamente.')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleDeleteMaterial(id: string) {
    await supabase.from('ai_config').update({ is_active: false }).eq('id', id)
    loadMaterials()
    showToast('Material excluído')
  }

  useEffect(() => {
    if (activeTab === 'mentor') loadMaterials()
    if (activeTab === 'users') loadUsers()
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'mentor') return
    const hasProcessing = materials.some(m => ['transcribing', 'extracting', 'uploading'].includes(m.status))
    if (!hasProcessing) return
    const interval = setInterval(loadMaterials, 10000)
    return () => clearInterval(interval)
  }, [activeTab, materials])

  // Voice clone load
  useEffect(() => {
    if (activeTab === 'voice') {
      supabase.from('ai_config')
        .select('*')
        .eq('config_type', 'voice_clone')
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            let meta: Record<string, string> = {}
            try { meta = JSON.parse(data.config_value || '{}') } catch {}
            setVoiceActive(data.is_active)
            setVoiceId(meta.voice_id || '')
            setVoiceEndpoint(meta.endpoint || '')
          }
        })
    }
  }, [activeTab])

  async function saveVoiceConfig() {
    setSavingVoice(true)
    await supabase.from('ai_config').upsert({
      config_type: 'voice_clone',
      config_key: 'settings',
      config_value: JSON.stringify({ voice_id: voiceId, endpoint: voiceEndpoint }),
      is_active: voiceActive,
    }, { onConflict: 'config_type,config_key' })
    setSavingVoice(false)
    showToast('Configuração de voz salva')
  }

  async function toggleVoice(active: boolean) {
    setVoiceActive(active)
    await supabase.from('ai_config')
      .update({ is_active: active })
      .eq('config_type', 'voice_clone')
  }

  if (authLoading || loading) {
    return <div className="space-y-4"><Skeleton className="skeleton-shimmer h-10 w-48" /><Skeleton className="skeleton-shimmer h-96 rounded-[16px]" /></div>
  }

  if (!isAdmin) {
    return <EmptyState icon={ShieldAlert} title="Acesso restrito" description="Acesso restrito a administradores" />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">Configurações da IA</h2>
          <p className="text-[#414844] opacity-80 mt-1">Personalize como o agente de vendas se comporta nas conversas</p>
        </div>
        {lastSaved && (
          <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5">
            <Check className="w-3 h-3 text-[#10B981]" />
            Salvo {formatDistanceToNow(lastSaved, { locale: ptBR, addSuffix: true })}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#F3F4F6] mb-6 overflow-x-auto hide-scrollbar">
        {TABS.filter(t => !t.adminOnly || isAdmin).map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-all relative whitespace-nowrap flex-shrink-0',
                activeTab === tab.id
                  ? 'text-[#111827] font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              )}
            >
              <Icon className={cn('w-4 h-4', activeTab === tab.id ? 'text-[#7A9E00]' : 'text-[#C0C7D0]')} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C8E645] rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* ═══ TAB: PERSONALITY ═══ */}
      {activeTab === 'personality' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5]">
              <h3 className="text-[15px] font-bold text-[#111827]">Personalidade do agente</h3>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5">Descreva como a IA deve se comportar, que tom usar, o que evitar</p>
            </div>
            <div className="p-6">
              <textarea
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                rows={14}
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[12px] px-5 py-4 text-[14px] text-[#374151] leading-relaxed placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all resize-none font-mono"
                placeholder="Ex: Você é o Lukhas, personal trainer descontraído..."
              />
              <div className="flex items-start gap-2.5 mt-3 p-3 bg-[#C8E645]/[0.06] rounded-[10px]">
                <Info className="w-4 h-4 text-[#7A9E00] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#5A6B00] leading-relaxed">
                  Seja específico: inclua tom de voz, gírias que usa, limites do que pode/não pode falar, e como a IA deve reagir a objeções.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#F5F5F5] flex justify-end">
              <button
                onClick={() => saveText('personality', personality, 'Personalidade')}
                disabled={saving}
                className="relative flex items-center gap-2 px-5 py-2.5 bg-[#C8E645] text-[#111827] text-[13px] font-bold rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all disabled:opacity-50"
              >
                {personality !== originalPersonality && !saving && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#F59E0B] border-2 border-white" />
                )}
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>

          {/* Limite diário de mensagens da IA */}
          <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5]">
              <h3 className="text-[15px] font-bold text-[#111827]">Limite diário de mensagens da IA</h3>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5">
                Máximo de mensagens que a IA pode enviar por dia para cada lead. Após atingir o limite, a IA para de responder até o dia seguinte.
              </p>
            </div>
            <div className="p-6">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">
                Mensagens por dia
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxDailyAIMessages}
                  onChange={e => setMaxDailyAIMessages(e.target.value)}
                  className="w-[120px] bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] font-semibold text-[#374151] tabular-nums focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
                />
                <span className="text-[13px] text-[#6B7280] font-medium">mensagens por lead</span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-2">Valor recomendado: 20. Aceita de 1 a 50.</p>
            </div>
            <div className="px-6 py-4 border-t border-[#F5F5F5] flex justify-end">
              <button
                onClick={saveGuardrail}
                disabled={savingGuardrails || !maxDailyAIMessages.trim()}
                className="relative flex items-center gap-2 px-5 py-2.5 bg-[#C8E645] text-[#111827] text-[13px] font-bold rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all disabled:opacity-50"
              >
                {maxDailyAIMessages !== originalMaxDailyAIMessages && !savingGuardrails && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#F59E0B] border-2 border-white" />
                )}
                {savingGuardrails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingGuardrails ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: BANNED WORDS ═══ */}
      {activeTab === 'banned' && (
        <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F5F5F5]">
            <h3 className="text-[15px] font-bold text-[#111827]">Palavras proibidas</h3>
            <p className="text-[13px] text-[#9CA3AF] mt-0.5">Palavras que a IA nunca deve usar nas conversas</p>
          </div>
          <div className="p-6">
            {/* Word pills */}
            <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
              {bannedWords.map(w => (
                <span key={w.id} className="inline-flex items-center gap-1.5 bg-[#F7F8F9] border border-[#EFEFEF] text-[#374151] text-[13px] font-medium px-3 py-1.5 rounded-full group hover:border-[#EF4444]/30 hover:bg-[#FEF2F2] transition-all">
                  {w.config_value}
                  <button onClick={() => removeBannedWord(w.id)} className="text-[#C0C7D0] group-hover:text-[#EF4444] transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {bannedWords.length === 0 && (
                <p className="text-[13px] text-[#C0C7D0] italic">Nenhuma palavra proibida ainda</p>
              )}
            </div>

            {/* Add input */}
            <div className="flex gap-2">
              <input
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBannedWord() } }}
                placeholder="Adicionar palavra..."
                className="flex-1 bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-full px-4 py-2.5 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all"
              />
              <button
                onClick={addBannedWord}
                disabled={!newWord.trim()}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all',
                  newWord.trim()
                    ? 'bg-[#C8E645] text-[#111827] shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95'
                    : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed'
                )}
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>

            {/* Suggestions */}
            <div className="mt-4 pt-4 border-t border-[#F5F5F5]">
              <p className="text-[11px] text-[#9CA3AF] uppercase tracking-[0.06em] mb-2">Sugestões comuns</p>
              <div className="flex flex-wrap gap-1.5">
                {BANNED_SUGGESTIONS.map(suggestion => {
                  const alreadyAdded = bannedWords.some(w => w.config_value.toLowerCase() === suggestion.toLowerCase())
                  return (
                    <button
                      key={suggestion}
                      onClick={() => !alreadyAdded && addBannedWordDirect(suggestion)}
                      disabled={alreadyAdded}
                      className={cn(
                        'text-[12px] px-2.5 py-1 rounded-full border transition-all',
                        alreadyAdded
                          ? 'border-[#F3F4F6] text-[#D1D5DB] cursor-not-allowed line-through'
                          : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#C8E645]/40 hover:bg-[#C8E645]/5 cursor-pointer'
                      )}
                    >
                      + {suggestion}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: EXAMPLES ═══ */}
      {activeTab === 'examples' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-4 bg-[#C8E645]/[0.06] rounded-[12px]">
            <Info className="w-4 h-4 text-[#7A9E00] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#5A6B00] leading-relaxed">
              Cole aqui conversas reais que mostram o tom ideal. A IA vai aprender com esses exemplos para replicar o estilo.
            </p>
          </div>

          {examples.map((example, index) => (
            <div key={example.id} className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden group">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#F5F5F5]">
                <span className="text-[13px] font-semibold text-[#111827]">Exemplo #{index + 1}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => removeExample(example.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C0C7D0] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <textarea
                  value={example.config_value}
                  onChange={e => updateExample(example.id, e.target.value)}
                  onBlur={() => saveExample(example.id)}
                  rows={6}
                  className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[13px] text-[#374151] leading-relaxed focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all resize-none font-mono"
                />
              </div>
            </div>
          ))}

          {/* Add new inline */}
          {newExample ? (
            <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#F5F5F5]">
                <span className="text-[13px] font-semibold text-[#111827]">Novo exemplo</span>
                <button onClick={() => setNewExample('')} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                <textarea
                  value={newExample}
                  onChange={e => setNewExample(e.target.value)}
                  rows={6}
                  autoFocus
                  placeholder="Cole aqui um exemplo de conversa..."
                  className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[13px] text-[#374151] leading-relaxed placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all resize-none font-mono"
                />
              </div>
              <div className="px-5 py-3 border-t border-[#F5F5F5] flex justify-end">
                <button
                  onClick={addExample}
                  disabled={!newExample.trim()}
                  className={cn(
                    'flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-bold transition-all',
                    newExample.trim()
                      ? 'bg-[#C8E645] text-[#111827] shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95'
                      : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed'
                  )}
                >
                  <Plus className="w-4 h-4" /> Salvar exemplo
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNewExample(' ')}
              className="w-full py-4 border-[2px] border-dashed border-[#E5E7EB] rounded-[16px] text-[13px] font-semibold text-[#6B7280] hover:border-[#C8E645]/40 hover:bg-[#C8E645]/[0.03] hover:text-[#3D4F00] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar exemplo de conversa
            </button>
          )}
        </div>
      )}

      {/* ═══ TAB: PROTOCOL ═══ */}
      {activeTab === 'protocol' && (
        <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F5F5F5]">
            <h3 className="text-[15px] font-bold text-[#111827]">Protocolo de vendas</h3>
            <p className="text-[13px] text-[#9CA3AF] mt-0.5">Defina as etapas que a IA segue: Social Selling → SPIN Selling → Convite pra call</p>
          </div>
          <div className="p-6">
            <textarea
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
              rows={16}
              className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[12px] px-5 py-4 text-[14px] text-[#374151] leading-relaxed placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all resize-none font-mono"
              placeholder="Descreva o protocolo de vendas passo a passo..."
            />
          </div>
          <div className="px-6 py-4 border-t border-[#F5F5F5] flex justify-end">
            <button
              onClick={() => saveText('sales_protocol', protocol, 'Protocolo')}
              disabled={saving}
              className="relative flex items-center gap-2 px-5 py-2.5 bg-[#C8E645] text-[#111827] text-[13px] font-bold rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all disabled:opacity-50"
            >
              {protocol !== originalProtocol && !saving && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#F59E0B] border-2 border-white" />
              )}
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB: MENTOR MATERIAL ═══ */}
      {activeTab === 'mentor' && (
        <div className="space-y-6">
          {/* Info card */}
          <div className="flex items-start gap-3 p-4 bg-[#C8E645]/[0.06] rounded-[12px]">
            <Info className="w-5 h-5 text-[#7A9E00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-[#5A6B00]">Como funciona</p>
              <p className="text-[12px] text-[#5A6B00]/80 leading-relaxed mt-0.5">
                Suba vídeos das aulas do seu mentor. O sistema transcreve automaticamente e extrai os princípios e técnicas de vendas pra IA usar nas conversas.
              </p>
            </div>
          </div>

          {/* Upload zone */}
          <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5]">
              <h3 className="text-[15px] font-bold text-[#111827]">Upload de material</h3>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5">Formatos: MP3, MP4, M4A, WAV, WebM, MOV &middot; Máximo 25MB</p>
            </div>
            <div className="p-6">
              {/* Tipo de material */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-2 block">
                  Tipo de material <span className="text-[#EF4444]">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'dm' as const, label: 'DM / Rapport', desc: 'Alimenta o agente de conversas', icon: MessageSquare },
                    { value: 'calls' as const, label: 'Análise de Calls', desc: 'Alimenta a análise de vendas', icon: Phone },
                    { value: 'ambos' as const, label: 'Ambos', desc: 'Alimenta os dois sistemas', icon: Layers },
                  ]).map(opt => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMaterialType(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-[12px] border text-center transition-all',
                          materialType === opt.value
                            ? 'border-[#C8E645] bg-[#C8E645]/5 shadow-[0_0_0_2px_rgba(200,230,69,0.15)]'
                            : 'border-[#EFEFEF] bg-[#F7F8F9] hover:border-[#C8E645]/40'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-[10px] flex items-center justify-center',
                          materialType === opt.value ? 'bg-[#C8E645]/20' : 'bg-[#F3F4F6]'
                        )}>
                          <Icon className={cn('w-5 h-5', materialType === opt.value ? 'text-[#7A9E00]' : 'text-[#9CA3AF]')} />
                        </div>
                        <div>
                          <p className={cn(
                            'text-[13px]',
                            materialType === opt.value ? 'font-bold text-[#111827]' : 'font-medium text-[#374151]'
                          )}>
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {!uploadFile && !uploading ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'relative border-[2px] border-dashed rounded-[14px] p-10 text-center cursor-pointer transition-all',
                    dragActive
                      ? 'border-[#C8E645] bg-[#C8E645]/5'
                      : 'border-[#E5E7EB] hover:border-[#C8E645]/40 hover:bg-[#FAFBFC]'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={e => { if (e.target.files?.[0]) handleVideoFile(e.target.files[0]); e.target.value = '' }}
                    className="hidden"
                  />
                  <div className={cn(
                    'w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors',
                    dragActive ? 'bg-[#C8E645]/20' : 'bg-[#F3F4F6]'
                  )}>
                    <Upload className={cn('w-7 h-7', dragActive ? 'text-[#7A9E00]' : 'text-[#9CA3AF]')} />
                  </div>
                  <p className="text-[14px] font-semibold text-[#111827] mb-1">
                    {dragActive ? 'Solte o arquivo aqui' : 'Arraste o arquivo aqui'}
                  </p>
                  <p className="text-[13px] text-[#9CA3AF]">
                    ou <span className="text-[#7A9E00] font-medium">clique pra selecionar</span>
                  </p>
                </div>
              ) : uploadFile && !uploading ? (
                <div className="flex items-center gap-4 p-4 bg-[#F7F8F9] rounded-[12px] border border-[#EFEFEF]">
                  <div className="w-12 h-12 rounded-[10px] bg-[#1B3A2D]/5 flex items-center justify-center flex-shrink-0">
                    <Film className="w-6 h-6 text-[#1B3A2D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827] truncate">{uploadFile.name}</p>
                    <p className="text-[12px] text-[#9CA3AF]">{formatFileSize(uploadFile.size)}</p>
                  </div>
                  <button onClick={() => { setUploadFile(null); setUploadError('') }}
                    className="w-8 h-8 rounded-full hover:bg-[#FEF2F2] flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] transition-all">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={handleUpload}
                    disabled={!materialType}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-full transition-all',
                      materialType
                        ? 'bg-[#C8E645] text-[#111827] shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95'
                        : 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed'
                    )}>
                    <Upload className="w-4 h-4" /> Enviar
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#F7F8F9] rounded-[12px] border border-[#EFEFEF]">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#C8E645]/15 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-[#7A9E00] animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#111827] truncate">{uploadFile?.name}</p>
                      <p className="text-[12px] text-[#9CA3AF]">Enviando... {uploadProgress}%</p>
                    </div>
                  </div>
                  <div className="w-full h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C8E645] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="mt-3 flex items-center gap-2 text-[13px] text-[#EF4444]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {uploadError}
                </div>
              )}
              {!materialType && uploadFile && !uploadError && (
                <p className="text-[12px] text-[#D97706] flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Selecione o tipo de material antes de enviar
                </p>
              )}
            </div>
          </div>

          {/* Material list */}
          {materials.length === 0 ? (
            <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6 text-[#C0C7D0]" />
              </div>
              <h3 className="text-[15px] font-bold text-[#111827] mb-1">Nenhum material enviado</h3>
              <p className="text-[13px] text-[#9CA3AF]">Envie vídeos do seu mentor pra enriquecer a IA</p>
            </div>
          ) : (
            <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[#111827]">Materiais processados</h3>
                <span className="text-[12px] text-[#9CA3AF]">{materials.length} {materials.length === 1 ? 'arquivo' : 'arquivos'}</span>
              </div>
              <div className="divide-y divide-[#F5F5F5]">
                {materials.map(material => {
                  const cfg = getMaterialStatusConfig(material.status)
                  return (
                    <div key={material.id} className="group">
                      <div className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFBFC] transition-colors">
                        <div className="w-10 h-10 rounded-[10px] bg-[#1B3A2D]/5 flex items-center justify-center flex-shrink-0">
                          <Film className="w-5 h-5 text-[#1B3A2D]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold text-[#111827] truncate">{material.file_name}</p>
                            {material.config_type && material.config_type !== 'mentor_material' && (
                              <span className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                                material.config_type === 'mentor_material_dm'
                                  ? 'bg-[#C8E645]/15 text-[#7A9E00]'
                                  : 'bg-[#8B5CF6]/10 text-[#7C3AED]'
                              )}>
                                {material.config_type === 'mentor_material_dm' ? 'DM' : 'Calls'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#9CA3AF]">
                            <span>{formatFileSize(material.file_size)}</span>
                            {material.duration_seconds != null && (
                              <>
                                <span className="text-[#E5E7EB]">&middot;</span>
                                <span>{Math.round(material.duration_seconds / 60)} min</span>
                              </>
                            )}
                            <span className="text-[#E5E7EB]">&middot;</span>
                            <span>{formatDistanceToNow(new Date(material.uploaded_at), { locale: ptBR, addSuffix: true })}</span>
                          </div>
                        </div>
                        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0', cfg.color)}>
                          <cfg.Icon className={cn('w-3 h-3', cfg.animate && 'animate-spin')} />
                          {cfg.label}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {material.status === 'ready' && material.content_preview && (
                            <button
                              onClick={() => setExpandedMaterial(expandedMaterial === material.id ? null : material.id)}
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                                expandedMaterial === material.id
                                  ? 'bg-[#C8E645]/15 text-[#7A9E00]'
                                  : 'text-[#C0C7D0] hover:bg-[#F3F4F6] hover:text-[#6B7280]'
                              )}
                            >
                              <ChevronDown className={cn('w-4 h-4 transition-transform', expandedMaterial === material.id && 'rotate-180')} />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteMaterialConfirm(material.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#C0C7D0] hover:bg-[#FEF2F2] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {expandedMaterial === material.id && material.content_preview && (
                        <div className="px-6 pb-4 animate-dropdown-in">
                          <div className="ml-14 bg-[#F7F8F9] rounded-[12px] border border-[#EFEFEF] p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="w-4 h-4 text-[#7A9E00]" />
                              <span className="text-[11px] font-bold text-[#7A9E00] uppercase tracking-[0.04em]">Conteúdo extraído</span>
                            </div>
                            <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">{material.content_preview}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Delete confirmation dialog */}
          <Dialog open={!!deleteMaterialConfirm} onOpenChange={() => setDeleteMaterialConfirm(null)}>
            <DialogContent className="[&>button]:hidden bg-white rounded-[20px] p-0 w-[calc(100vw-32px)] max-w-[400px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-[#EF4444]" />
                </div>
                <h3 className="text-[16px] font-bold text-[#111827] mb-1">Excluir material</h3>
                <p className="text-[13px] text-[#6B7280]">O conteúdo extraído também será removido. Essa ação não pode ser desfeita.</p>
              </div>
              <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3">
                <button onClick={() => setDeleteMaterialConfirm(null)}
                  className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all">
                  Cancelar
                </button>
                <button onClick={() => { if (deleteMaterialConfirm) handleDeleteMaterial(deleteMaterialConfirm); setDeleteMaterialConfirm(null) }}
                  className="flex-1 py-3 bg-[#EF4444] text-white rounded-full text-[14px] font-bold hover:bg-[#DC2626] active:scale-[0.98] transition-all">
                  Excluir
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ═══ TAB: VOICE CLONE ═══ */}
      {activeTab === 'voice' && (
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5]">
              <h3 className="text-[15px] font-bold text-[#111827]">Status do clone de voz</h3>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5">Configure o clone de voz pra enviar áudios personalizados</p>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between p-4 bg-[#F7F8F9] rounded-[12px]">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    voiceActive ? 'bg-[#10B981]/10' : 'bg-[#F3F4F6]'
                  )}>
                    <Mic className={cn('w-6 h-6', voiceActive ? 'text-[#059669]' : 'text-[#C0C7D0]')} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#111827]">
                      {voiceActive ? 'Clone de voz ativo' : 'Clone de voz inativo'}
                    </p>
                    <p className="text-[12px] text-[#9CA3AF]">
                      {voiceActive
                        ? 'Pronto pra gerar áudios na ficha do lead'
                        : 'Configure o Voice ID e o endpoint pra ativar'
                      }
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleVoice(!voiceActive)}
                  className={cn(
                    'w-12 h-7 rounded-full transition-all duration-200 relative flex-shrink-0',
                    voiceActive ? 'bg-[#C8E645]' : 'bg-[#E5E7EB]'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white shadow-sm absolute top-1 transition-all duration-200',
                    voiceActive ? 'left-6' : 'left-1'
                  )} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">
                    Voice ID
                  </label>
                  <input
                    value={voiceId}
                    onChange={e => setVoiceId(e.target.value)}
                    placeholder="ID da voz clonada"
                    className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">
                    Endpoint de geração (Pedro configura)
                  </label>
                  <input
                    value={voiceEndpoint}
                    onChange={e => setVoiceEndpoint(e.target.value)}
                    placeholder="https://n8n.exemplo.com/webhook/generate-audio"
                    className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.12)] transition-all font-mono"
                  />
                </div>

                <button
                  onClick={saveVoiceConfig}
                  disabled={savingVoice}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#C8E645] text-[#111827] text-[13px] font-bold rounded-full shadow-[0_2px_8px_rgba(200,230,69,0.3)] hover:-translate-y-px active:scale-95 transition-all disabled:opacity-50"
                >
                  {savingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar configuração
                </button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-[#C8E645]/[0.06] rounded-[12px]">
            <Info className="w-5 h-5 text-[#7A9E00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-[#5A6B00]">Como funciona</p>
              <p className="text-[12px] text-[#5A6B00]/80 leading-relaxed mt-0.5">
                Com o clone ativo, um botão "Gerar áudio" aparece na ficha de cada lead. O sistema pega a última mensagem da IA, gera um áudio com a voz do Lukhas e permite enviar via WhatsApp ou baixar pra enviar no Instagram.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: USERS (admin only) ═══ */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-[#C8E645]/[0.06] rounded-[12px]">
            <Info className="w-5 h-5 text-[#7A9E00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-[#5A6B00]">Gerenciamento de acessos</p>
              <p className="text-[12px] text-[#5A6B00]/80 leading-relaxed mt-0.5">
                Admins editam configurações e gerenciam usuários. Operadores só usam o CRM. Sempre precisa existir pelo menos 1 admin ativo.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[16px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-[#111827]">Usuários do sistema</h3>
                <p className="text-[13px] text-[#9CA3AF] mt-0.5">{users.length} {users.length === 1 ? 'usuário' : 'usuários'}</p>
              </div>
              <button
                onClick={openCreateUser}
                className="flex items-center gap-2 bg-[#1B3A2D] text-white px-5 py-2.5 rounded-full text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" /> Novo Usuário
              </button>
            </div>

            {usersLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-14 rounded-[10px]" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-[#F7F8F9] flex items-center justify-center mx-auto mb-3">
                  <UsersIcon className="w-6 h-6 text-[#C0C7D0]" />
                </div>
                <p className="text-[13px] font-medium text-[#6B7280]">Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#FAFBFC] border-b border-[#F3F4F6]">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Nome</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden md:table-cell">Email</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Permissão</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">Status</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] hidden lg:table-cell">Criado</th>
                    <th className="w-[140px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const self = isSelf(u)
                    return (
                      <tr key={u.id} className="border-b border-[#F5F5F5] last:border-b-0 hover:bg-[#FAFBFC] transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-[#111827] truncate">{u.name}</p>
                            {self && <span className="text-[9px] font-bold text-[#7A9E00] bg-[#C8E645]/15 px-1.5 py-0.5 rounded">VOCÊ</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-[12px] text-[#6B7280] truncate max-w-[240px]">{u.email}</td>
                        <td className="px-5 py-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#C8E645]/15 text-[#7A9E00]">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#3B82F6]/10 text-[#2563EB]">
                              <UsersIcon className="w-3 h-3" /> Operador
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#10B981]/10 text-[#059669]">
                              <div className="w-[5px] h-[5px] rounded-full bg-[#10B981]" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[#EF4444]/10 text-[#DC2626]">
                              <div className="w-[5px] h-[5px] rounded-full bg-[#EF4444]" />
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-[12px] text-[#6B7280]">
                          {format(new Date(u.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditUser(u)} title="Editar"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C0C7D0] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openResetPassword(u)} title="Resetar senha"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C0C7D0] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all">
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setUserActionConfirm({ type: u.is_active ? 'deactivate' : 'activate', user: u })}
                              disabled={self}
                              title={self ? 'Não pode alterar seu próprio status' : (u.is_active ? 'Desativar' : 'Ativar')}
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                                self ? 'text-[#D1D5DB] cursor-not-allowed' : 'text-[#C0C7D0] hover:bg-[#F3F4F6] hover:text-[#374151]',
                              )}
                            >
                              {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setUserActionConfirm({ type: 'delete', user: u })}
                              disabled={self}
                              title={self ? 'Não pode excluir a si mesmo' : 'Excluir'}
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                                self ? 'text-[#D1D5DB] cursor-not-allowed' : 'text-[#C0C7D0] hover:bg-[#FEF2F2] hover:text-[#EF4444]',
                              )}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Dialog: Criar / Editar usuário */}
      <Dialog open={userDialogMode === 'create' || userDialogMode === 'edit'} onOpenChange={open => { if (!open) closeUserDialog() }}>
        <DialogContent className="[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[480px] max-h-[calc(100vh-48px)] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
            <h3 className="text-[18px] font-bold text-[#111827]">
              {userDialogMode === 'edit' ? 'Editar usuário' : 'Novo usuário'}
            </h3>
            <button onClick={closeUserDialog} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 dropdown-scroll px-6 pb-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Nome</label>
              <input
                value={userForm.name}
                onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome completo"
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Email</label>
              <input
                type="email"
                value={userForm.email}
                onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))}
                placeholder="usuario@exemplo.com"
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all"
              />
            </div>

            {userDialogMode === 'create' && (
              <div>
                <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Senha temporária</label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all font-mono"
                />
                <p className="text-[11px] text-[#9CA3AF] mt-1.5">Compartilhe essa senha com o usuário. Ele pode trocar depois.</p>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-2 block">Permissão</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'operator' as const, label: 'Operador', desc: 'Usa o CRM', icon: UsersIcon },
                  { value: 'admin' as const, label: 'Admin', desc: 'Acesso total', icon: Shield },
                ]).map(opt => {
                  const Icon = opt.icon
                  const selected = userForm.role === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUserForm(p => ({ ...p, role: opt.value }))}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-[12px] border text-left transition-all',
                        selected
                          ? 'border-[#C8E645] bg-[#C8E645]/5 shadow-[0_0_0_2px_rgba(200,230,69,0.15)]'
                          : 'border-[#EFEFEF] bg-[#F7F8F9] hover:border-[#C8E645]/40'
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0',
                        selected ? 'bg-[#C8E645]/20' : 'bg-[#F3F4F6]'
                      )}>
                        <Icon className={cn('w-4 h-4', selected ? 'text-[#7A9E00]' : 'text-[#9CA3AF]')} />
                      </div>
                      <div>
                        <p className={cn('text-[13px]', selected ? 'font-bold text-[#111827]' : 'font-medium text-[#374151]')}>{opt.label}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{opt.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {userFormError && (
              <div className="flex items-start gap-2 p-3 bg-[#FEF2F2] rounded-[10px] border border-[#EF4444]/15">
                <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#DC2626] leading-relaxed">{userFormError}</p>
              </div>
            )}
          </div>

          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3 flex-shrink-0">
            <button onClick={closeUserDialog} disabled={savingUser} className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all disabled:opacity-50">Cancelar</button>
            <button
              onClick={userDialogMode === 'edit' ? handleUpdateUser : handleCreateUser}
              disabled={savingUser}
              className={cn(
                'flex-1 py-3 rounded-full text-[14px] font-bold transition-all flex items-center justify-center gap-2',
                savingUser ? 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed' : 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]',
              )}
            >
              {savingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : userDialogMode === 'edit' ? 'Salvar alterações' : 'Criar usuário'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Resetar senha */}
      <Dialog open={userDialogMode === 'password'} onOpenChange={open => { if (!open) closeUserDialog() }}>
        <DialogContent className="[&>button]:hidden bg-white rounded-[20px] p-0 overflow-hidden w-[calc(100vw-32px)] max-w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <div>
              <h3 className="text-[18px] font-bold text-[#111827]">Resetar senha</h3>
              <p className="text-[13px] text-[#6B7280] mt-1">Definir nova senha para <strong className="text-[#111827]">{editingUser?.name}</strong></p>
            </div>
            <button onClick={closeUserDialog} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          </div>

          <div className="px-6 pb-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Nova senha</label>
              <input
                type="text"
                autoFocus
                value={userForm.password}
                onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-1.5 block">Confirmar nova senha</label>
              <input
                type="text"
                value={userForm.confirmPassword}
                onChange={e => setUserForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Repita a senha"
                className="w-full bg-[#F7F8F9] border-[1.5px] border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[14px] text-[#374151] placeholder-[#C0C7D0] focus:border-[#C8E645] focus:ring-0 focus:outline-none focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,230,69,0.15)] transition-all font-mono"
              />
            </div>
            {userFormError && (
              <div className="flex items-start gap-2 p-3 bg-[#FEF2F2] rounded-[10px] border border-[#EF4444]/15">
                <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#DC2626] leading-relaxed">{userFormError}</p>
              </div>
            )}
          </div>

          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3">
            <button onClick={closeUserDialog} disabled={savingUser} className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] active:scale-[0.98] transition-all disabled:opacity-50">Cancelar</button>
            <button
              onClick={handleResetPassword}
              disabled={savingUser || !userForm.password.trim()}
              className={cn(
                'flex-1 py-3 rounded-full text-[14px] font-bold transition-all flex items-center justify-center gap-2',
                savingUser || !userForm.password.trim() ? 'bg-[#F3F4F6] text-[#C0C7D0] cursor-not-allowed' : 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)] hover:-translate-y-px active:scale-[0.98]',
              )}
            >
              {savingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Alterar senha'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmação (delete/desativar/ativar) */}
      <Dialog open={!!userActionConfirm} onOpenChange={open => { if (!open) setUserActionConfirm(null) }}>
        <DialogContent className="[&>button]:hidden bg-white rounded-[20px] p-0 w-[calc(100vw-32px)] max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="p-6 text-center">
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4',
              userActionConfirm?.type === 'delete' ? 'bg-[#EF4444]/10'
                : userActionConfirm?.type === 'deactivate' ? 'bg-[#F59E0B]/10'
                  : 'bg-[#10B981]/10'
            )}>
              {userActionConfirm?.type === 'delete' && <Trash2 className="w-6 h-6 text-[#EF4444]" />}
              {userActionConfirm?.type === 'deactivate' && <UserX className="w-6 h-6 text-[#D97706]" />}
              {userActionConfirm?.type === 'activate' && <UserCheck className="w-6 h-6 text-[#059669]" />}
            </div>
            <h3 className="text-[16px] font-bold text-[#111827] mb-1">
              {userActionConfirm?.type === 'delete' && `Excluir ${userActionConfirm.user.name}?`}
              {userActionConfirm?.type === 'deactivate' && `Desativar ${userActionConfirm.user.name}?`}
              {userActionConfirm?.type === 'activate' && `Ativar ${userActionConfirm.user.name}?`}
            </h3>
            <p className="text-[13px] text-[#6B7280]">
              {userActionConfirm?.type === 'delete' && 'Essa ação não pode ser desfeita.'}
              {userActionConfirm?.type === 'deactivate' && 'O usuário não conseguirá mais fazer login.'}
              {userActionConfirm?.type === 'activate' && 'O usuário poderá voltar a fazer login.'}
            </p>
          </div>
          <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3">
            <button onClick={() => setUserActionConfirm(null)} disabled={userActionBusy} className="flex-1 py-3 border-[1.5px] border-[#E5E7EB] rounded-full text-[14px] font-semibold text-[#6B7280] hover:bg-[#F7F8F9] transition-all disabled:opacity-50">Cancelar</button>
            <button
              onClick={handleUserAction}
              disabled={userActionBusy}
              className={cn(
                'flex-1 py-3 rounded-full text-[14px] font-bold transition-all flex items-center justify-center gap-2',
                userActionConfirm?.type === 'delete' ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                  : userActionConfirm?.type === 'deactivate' ? 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
                    : 'bg-[#C8E645] text-[#111827] shadow-[0_4px_14px_rgba(200,230,69,0.35)]',
                userActionBusy && 'opacity-70 cursor-not-allowed',
              )}
            >
              {userActionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {userActionConfirm?.type === 'delete' && 'Excluir'}
              {userActionConfirm?.type === 'deactivate' && 'Desativar'}
              {userActionConfirm?.type === 'activate' && 'Ativar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-[#111827] text-white text-[13px] font-medium px-4 py-3 rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] animate-dropdown-in z-50">
          <Check className="w-4 h-4 text-[#C8E645]" />
          {toast}
        </div>
      )}
    </div>
  )
}
