'use client'

import { useEffect, useState, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import type { LeadStage } from '@/lib/types'
import { PeriodFilter, type DateRange } from '@/components/dashboard/PeriodFilter'
import { getActivityConfig, getActivityDetail } from '@/lib/activity-config'
import { LeadAvatar } from '@/components/common/LeadAvatar'
import {
  UserPlus, MessageCircle, Calendar, Zap, CalendarCheck, Target,
  Camera, MessageSquareText, Send, Heart, Pencil, Share2, Leaf, Megaphone,
  ChevronDown, Sparkles, HelpCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ═══ Constants ═══ */

const STAGE_LABELS: Record<string, string> = {
  novo: 'Novo', lead_frio: 'Lead Frio', rapport: 'Rapport',
  social_selling: 'Social Sell', spin: 'SPIN', call_agendada: 'Call Agend',
  fechado: 'Fechado', perdido: 'Perdido', follow_up: 'Follow-up',
}

const FUNNEL_ORDER: LeadStage[] = [
  'novo', 'rapport', 'social_selling', 'spin', 'call_agendada', 'fechado',
]

const FUNNEL_COLORS = [
  '#C8E645', '#A6C568', '#84A54F', '#628537', '#406520', '#1B3A2D',
]

const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const SOURCE_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  instagram_comment: { icon: Camera, color: '#C8E645', label: 'Comentários' },
  comentario: { icon: Camera, color: '#C8E645', label: 'Comentários' },
  comment: { icon: Camera, color: '#C8E645', label: 'Comentários' },
  instagram_story: { icon: MessageSquareText, color: '#0D9488', label: 'Respostas de Story' },
  story_reply: { icon: MessageSquareText, color: '#0D9488', label: 'Respostas de Story' },
  instagram_dm: { icon: Send, color: '#3B82F6', label: 'Mensagens Diretas' },
  dm_direta: { icon: Send, color: '#3B82F6', label: 'Mensagens Diretas' },
  dm: { icon: Send, color: '#3B82F6', label: 'Mensagens Diretas' },
  instagram_follow: { icon: UserPlus, color: '#8B5CF6', label: 'Novos Seguidores' },
  seguidor: { icon: UserPlus, color: '#8B5CF6', label: 'Novos Seguidores' },
  follow: { icon: UserPlus, color: '#8B5CF6', label: 'Novos Seguidores' },
  instagram_like: { icon: Heart, color: '#EC4899', label: 'Curtidas' },
  curtida: { icon: Heart, color: '#EC4899', label: 'Curtidas' },
  like: { icon: Heart, color: '#EC4899', label: 'Curtidas' },
  manual: { icon: Pencil, color: '#F59E0B', label: 'Cadastro Manual' },
  indicacao: { icon: Share2, color: '#F97316', label: 'Indicação' },
  referral: { icon: Share2, color: '#F97316', label: 'Indicação' },
  organic: { icon: Leaf, color: '#10B981', label: 'Orgânico' },
  ads: { icon: Megaphone, color: '#EF4444', label: 'Anúncios' },
}

/* ═══ Types ═══ */

interface Metrics {
  leadsNovos: number
  emConversa: number
  callsAgendadas: number
  taxaResposta: number
  taxaAgendamento: number
  taxaFechamento: number
}

interface StageCount { stage: string; count: number }

interface Activity {
  id: string
  lead_id: string
  action: string
  details: any
  created_at: string
  lead_name: string | null
  lead_username: string | null
  lead_pic: string | null
}

interface FollowUp {
  id: string
  lead_id: string
  initial: string
  name: string
  detail: string
  profile_pic_url: string | null
  follow_up_count: number
}

interface OriginData {
  source: string
  count: number
  pct: number
}

/* ═══ Greeting ═══ */

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/* ═══ KPI Card ═══ */

function KpiCard({ label, value, icon: Icon, showBar, barPercent, href, tooltip, onClick }: {
  label: string
  value: string | number
  icon: LucideIcon
  showBar?: boolean
  barPercent?: number
  href?: string
  tooltip?: string
  onClick?: () => void
}) {
  const router = useRouter()
  const [showTooltip, setShowTooltip] = useState(false)

  function handleClick() {
    if (onClick) onClick()
    else if (href) router.push(href)
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative rounded-[16px] sm:rounded-[20px] border border-[#EFEFEF] p-[14px_16px] sm:p-[18px_22px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.09)] transition-all duration-300 flex flex-col justify-between cursor-pointer ${showBar ? 'min-h-[90px] sm:min-h-[110px] bg-white' : 'min-h-[96px] sm:min-h-[116px] bg-white'}`}
    >
      {showTooltip && tooltip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 bg-[#1B3A2D] text-white text-[11px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#1B3A2D]" />
        </div>
      )}
      <div>
        <div className="flex justify-between items-start">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#8A9199] uppercase tracking-[0.10em]">{label}</span>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] bg-[#F7F8F9] border border-[#EFEFEF] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#1B3A2D]" />
          </div>
        </div>
        {!showBar && (
          <div className="mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-[#F5F5F5]">
            <div className="text-[28px] sm:text-[36px] font-[800] text-[#0F172A] tracking-[-0.04em] leading-none">
              {value}
            </div>
          </div>
        )}
        {showBar && (
          <div className="text-[24px] sm:text-[30px] font-[700] text-[#0F172A] tracking-[-0.04em] leading-none mt-[8px] sm:mt-[10px]">
            {value}
          </div>
        )}
      </div>
      {showBar && barPercent !== undefined && (
        <div className="w-full h-[5px] sm:h-[6px] bg-[#F3F4F6] rounded-full mt-3 overflow-hidden">
          <div
            className="h-full rounded-full shadow-[0_0_8px_rgba(200,230,69,0.5)] bg-gradient-to-r from-[#C8E645] to-[#A8C43A] transition-all duration-700"
            style={{ width: `${Math.min(barPercent, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

/* ═══ Funnel Bar ═══ */

function FunnelBar({ label, count, max, color }: {
  label: string; count: number; max: number; color: string
}) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-0">
      <div className="w-24 sm:w-32 shrink-0">
        <span className="text-[12px] sm:text-[13px] font-bold text-[#414844]/70 uppercase tracking-tight">{label}</span>
      </div>
      <div className="flex-1">
        <div
          className="h-9 sm:h-10 rounded-r-lg flex items-center transition-all duration-700 min-w-[48px] cursor-default"
          style={{ width: `${Math.max(pct, 12)}%`, backgroundColor: color }}
        >
          <span className="ml-3 sm:ml-4 font-bold text-white text-[13px]">{count}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══ Page ═══ */

export default function DashboardPage() {
  const router = useRouter()
  const { profile } = useProfile()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [funnel, setFunnel] = useState<StageCount[]>([])
  const [chartBars, setChartBars] = useState<{ label: string; value: number }[]>([])
  const [chartTitle, setChartTitle] = useState('Leads por Semana')
  const [chartBadge, setChartBadge] = useState('Semana Atual')
  const [activities, setActivities] = useState<Activity[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [origins, setOrigins] = useState<OriginData[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [periodLabel, setPeriodLabel] = useState('Hoje')
  const [periodDropOpen, setPeriodDropOpen] = useState(false)
  const periodDropRef = useRef<HTMLDivElement>(null)
  const lastRangeRef = useRef<{ range: DateRange; label: string } | null>(null)
  const [originDropOpen, setOriginDropOpen] = useState(false)
  const originDropRef = useRef<HTMLDivElement>(null)
  const loadRef = useRef(0)
  const hasLoadedRef = useRef(false)


  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodDropRef.current && !periodDropRef.current.contains(e.target as Node)) setPeriodDropOpen(false)
      if (originDropRef.current && !originDropRef.current.contains(e.target as Node)) setOriginDropOpen(false)
    }
    if (periodDropOpen || originDropOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [periodDropOpen, originDropOpen])

  const QUICK_PERIODS = [
    { label: 'Hoje', range: () => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0); const e = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 999); return { from: s, to: e } } },
    { label: '7 dias', range: () => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0); const e = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 999); return { from: new Date(s.getTime() - 6 * 86400000), to: e } } },
    { label: '30 dias', range: () => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0); const e = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 999); return { from: new Date(s.getTime() - 29 * 86400000), to: e } } },
    { label: 'Este mês', range: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 999) } } },
  ]

  const loadData = useCallback(async (range: DateRange, label?: string) => {
    const id = ++loadRef.current
    lastRangeRef.current = { range, label: label || periodLabel }
    if (label) setPeriodLabel(label)
    if (hasLoadedRef.current) setReloading(true)
    else setInitialLoading(true)

    const supabase = createClient()
    const from = range.from.toISOString()
    const to = range.to.toISOString()
    const now = new Date()
    const weekAhead = new Date(now.getTime() + 7 * 86400000).toISOString()

    // Safe query helper — never throws, always returns fallback
    async function safeQuery<T>(query: PromiseLike<{ data: T | null; count?: number | null; error: any }>): Promise<{ data: T | null; count: number }> {
      try {
        const result = await query
        return { data: result.data, count: result.count ?? 0 }
      } catch {
        return { data: null, count: 0 }
      }
    }

    const [
      r_leadsNovos,
      r_emConversa,
      r_callsAgendadas,
      r_allLeads,
      r_stageData,
      r_weeklyLeads,
      r_upcomingFollowUps,
      r_sourceData,
      r_activities,
    ] = await Promise.all([
      safeQuery(supabase.from('leads').select('id', { count: 'exact', head: true })
        .gte('created_at', from).lte('created_at', to)),
      safeQuery(supabase.from('leads').select('id', { count: 'exact', head: true })
        .in('stage', ['rapport', 'social_selling', 'spin']).eq('is_active', true)
        .gte('created_at', from).lte('created_at', to)),
      safeQuery(supabase.from('calls').select('id', { count: 'exact', head: true })
        .gte('scheduled_at', now.toISOString()).lte('scheduled_at', weekAhead)),
      safeQuery<any[]>(supabase.from('leads').select('id, stage')
        .gte('created_at', from).lte('created_at', to)),
      safeQuery<any[]>(supabase.from('leads').select('stage')
        .gte('created_at', from).lte('created_at', to)),
      safeQuery<any[]>(supabase.from('leads').select('created_at')
        .gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: true })),
      safeQuery<any[]>(supabase.from('leads').select('id, name, instagram_username, profile_pic_url, next_follow_up_at, follow_up_count')
        .eq('stage', 'follow_up')
        .eq('is_active', true)
        .order('next_follow_up_at', { ascending: true, nullsFirst: false }).limit(3)),
      safeQuery<any[]>(supabase.from('leads').select('source')
        .gte('created_at', from).lte('created_at', to)),
      safeQuery<any[]>(supabase.from('activity_log').select('id, lead_id, action, details, created_at, lead:leads(name, instagram_username, profile_pic_url)')
        .gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false }).limit(10)),
    ])

    const leadsNovos = r_leadsNovos.count
    const emConversa = r_emConversa.count
    const callsAgendadas = r_callsAgendadas.count
    const allLeads = r_allLeads.data
    const stageData = r_stageData.data
    const weeklyLeads = r_weeklyLeads.data
    const upcomingFollowUps = r_upcomingFollowUps.data
    const sourceData = r_sourceData.data
    const recentActivities = r_activities.data

    // Stale response guard
    if (id !== loadRef.current) return

    const total = allLeads?.length || 1
    const withCall = allLeads?.filter((l: any) => l.stage === 'call_agendada' || l.stage === 'fechado' || l.stage === 'perdido').length || 0
    const closed = allLeads?.filter((l: any) => l.stage === 'fechado').length || 0

    // Funnel data
    const stageCounts: Record<string, number> = {}
    stageData?.forEach((l: any) => { stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1 })
    const funnelData = FUNNEL_ORDER.map(s => ({
      stage: STAGE_LABELS[s] || s,
      count: stageCounts[s] || 0,
    }))

    // Adaptive chart bucketing based on period range
    const rangeMs = range.to.getTime() - range.from.getTime()
    const rangeDays = Math.ceil(rangeMs / 86400000)
    const currentLabel = label || 'Hoje'
    let bars: { label: string; value: number }[] = []
    let cTitle = 'Leads'
    let cBadge = currentLabel

    const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

    if (rangeDays <= 1) {
      // TODAY: 8 time blocks of 3 hours
      cTitle = 'Leads por Horário'
      const slots = ['00h', '03h', '06h', '09h', '12h', '15h', '18h', '21h']
      const buckets = Array(8).fill(0)
      weeklyLeads?.forEach((l: any) => {
        const h = new Date(l.created_at).getHours()
        buckets[Math.floor(h / 3)]++
      })
      bars = slots.map((s, i) => ({ label: s, value: buckets[i] }))

    } else if (rangeDays <= 8) {
      // 7 DAYS: each of the 7 actual calendar days
      cTitle = 'Leads por Dia'
      const dayMap: Record<string, number> = {}
      const dayLabels: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(range.from.getTime() + i * 86400000)
        const key = d.toISOString().slice(0, 10)
        const lbl = DAY_NAMES[d.getDay()]
        dayMap[key] = 0
        dayLabels.push(lbl)
      }
      const keys = Object.keys(dayMap)
      weeklyLeads?.forEach((l: any) => {
        const key = new Date(l.created_at).toISOString().slice(0, 10)
        if (key in dayMap) dayMap[key]++
      })
      bars = keys.map((k, i) => ({ label: dayLabels[i], value: dayMap[k] }))

    } else if (rangeDays <= 31) {
      // 30 DAYS / THIS MONTH: daily bars, each labeled with day number
      cTitle = 'Leads por Dia'
      const dayMap: Record<string, { label: string; value: number }> = {}
      const ordered: string[] = []
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(range.from.getTime() + i * 86400000)
        const key = d.toISOString().slice(0, 10)
        dayMap[key] = { label: String(d.getDate()), value: 0 }
        ordered.push(key)
      }
      weeklyLeads?.forEach((l: any) => {
        const key = new Date(l.created_at).toISOString().slice(0, 10)
        if (dayMap[key]) dayMap[key].value++
      })
      // If more than 15 days, group into 5-day periods for readability
      if (rangeDays > 15) {
        cTitle = 'Leads por Período'
        const groupSize = Math.ceil(rangeDays / Math.min(Math.ceil(rangeDays / 5), 8))
        const grouped: { label: string; value: number }[] = []
        for (let i = 0; i < ordered.length; i += groupSize) {
          const chunk = ordered.slice(i, i + groupSize)
          const firstDay = new Date(chunk[0]).getDate()
          const lastDay = new Date(chunk[chunk.length - 1]).getDate()
          const sum = chunk.reduce((acc, k) => acc + dayMap[k].value, 0)
          const lbl = firstDay === lastDay ? `${firstDay}` : `${String(firstDay).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
          grouped.push({ label: lbl, value: sum })
        }
        bars = grouped
      } else {
        bars = ordered.map(k => dayMap[k])
      }

    } else {
      // CUSTOM LONG RANGE: bucket by month
      cTitle = 'Leads por Mês'
      const monthMap: Record<string, number> = {}
      const monthKeys: string[] = []
      const startMonth = range.from.getMonth()
      const endMonth = range.to.getMonth()
      const startYear = range.from.getFullYear()
      const endYear = range.to.getFullYear()
      for (let y = startYear; y <= endYear; y++) {
        const mStart = y === startYear ? startMonth : 0
        const mEnd = y === endYear ? endMonth : 11
        for (let m = mStart; m <= mEnd; m++) {
          const key = `${y}-${m}`
          monthMap[key] = 0
          monthKeys.push(key)
        }
      }
      weeklyLeads?.forEach((l: any) => {
        const d = new Date(l.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (key in monthMap) monthMap[key]++
      })
      bars = monthKeys.map(k => {
        const [, m] = k.split('-')
        return { label: SHORT_MONTHS[parseInt(m)], value: monthMap[k] }
      })
    }

    // Activities — if none in period, fetch most recent regardless
    let activityData = recentActivities
    if (!activityData || activityData.length === 0) {
      const { data: latestActs } = await supabase
        .from('activity_log')
        .select('id, lead_id, action, details, created_at, lead:leads(name, instagram_username, profile_pic_url)')
        .order('created_at', { ascending: false })
        .limit(10)
      activityData = latestActs
    }

    let finalActivities: Activity[] = (activityData || []).map((a: any) => {
      const leadObj = a.lead as any
      const rawName = leadObj?.name || a.details?.lead_name || null
      const rawUsername = leadObj?.instagram_username || null
      return {
        id: a.id,
        lead_id: a.lead_id,
        action: a.action || '',
        details: a.details || {},
        created_at: a.created_at,
        lead_name: rawName,
        lead_username: rawUsername,
        lead_pic: leadObj?.profile_pic_url || null,
      }
    }).filter(a => {
      // Filter out activities where lead only has brute ID
      const n = a.lead_name
      const u = a.lead_username
      const hasReadableName = n && !n.startsWith('ig_') && !/^\d{8,}$/.test(n)
      const hasReadableUsername = u && !u.startsWith('ig_') && !/^\d{8,}$/.test(u)
      return hasReadableName || hasReadableUsername
    }).slice(0, 5)

    // If activity_logs table is empty, derive activities from existing data
    if (finalActivities.length === 0) {
      const derived: Activity[] = []
      const [{ data: recentLeads }, { data: recentCalls }, { data: recentMsgs }] = await Promise.all([
        supabase.from('leads').select('id, name, instagram_username, profile_pic_url, created_at')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('calls').select('id, lead_id, scheduled_at, created_at, lead:leads(name, instagram_username, profile_pic_url)')
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('messages').select('id, lead_id, direction, created_at, lead:leads(name, instagram_username, profile_pic_url)')
          .eq('direction', 'outbound').order('created_at', { ascending: false }).limit(3),
      ])

      recentLeads?.forEach((l: any) => {
        const hasName = l.name && !l.name.startsWith('ig_') && !/^\d{8,}$/.test(l.name)
        const hasUser = l.instagram_username && !l.instagram_username.startsWith('ig_') && !/^\d{8,}$/.test(l.instagram_username)
        if (!hasName && !hasUser) return
        derived.push({
          id: `derived-lead-${l.id}`, lead_id: l.id, action: 'lead_created',
          details: {}, created_at: l.created_at,
          lead_name: l.name, lead_username: l.instagram_username, lead_pic: l.profile_pic_url,
        })
      })
      recentCalls?.forEach((c: any) => {
        const lo = c.lead as any
        const hasName = lo?.name && !lo.name.startsWith('ig_')
        const hasUser = lo?.instagram_username && !lo.instagram_username.startsWith('ig_')
        if (!hasName && !hasUser) return
        derived.push({
          id: `derived-call-${c.id}`, lead_id: c.lead_id, action: 'call_scheduled',
          details: { scheduled_at: c.scheduled_at }, created_at: c.created_at || c.scheduled_at,
          lead_name: lo?.name, lead_username: lo?.instagram_username, lead_pic: lo?.profile_pic_url,
        })
      })
      recentMsgs?.forEach((m: any) => {
        const lo = m.lead as any
        const hasName = lo?.name && !lo.name.startsWith('ig_')
        const hasUser = lo?.instagram_username && !lo.instagram_username.startsWith('ig_')
        if (!hasName && !hasUser) return
        derived.push({
          id: `derived-msg-${m.id}`, lead_id: m.lead_id, action: 'message_sent',
          details: { sent_by: 'ia' }, created_at: m.created_at,
          lead_name: lo?.name, lead_username: lo?.instagram_username, lead_pic: lo?.profile_pic_url,
        })
      })

      derived.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      finalActivities = derived.slice(0, 5)
    }

    // Follow-ups
    const finalFollowUps: FollowUp[] = (upcomingFollowUps || []).map((l: any) => {
      const name = l.name || l.instagram_username || 'Lead'
      let detail = ''
      if (l.next_follow_up_at) {
        const nextDate = new Date(l.next_follow_up_at)
        const diffMs = nextDate.getTime() - now.getTime()
        const diffMins = Math.round(diffMs / 60000)
        if (diffMins < 0) {
          const overdueMins = Math.abs(diffMins)
          if (overdueMins < 60) detail = `Atrasado ${overdueMins}min`
          else if (overdueMins < 1440) detail = `Atrasado ${Math.round(overdueMins / 60)}h`
          else detail = `Atrasado ${Math.round(overdueMins / 1440)}d`
        } else if (diffMins < 60) detail = `Em ${diffMins}min`
        else if (diffMins < 1440) detail = `Em ${Math.round(diffMins / 60)}h`
        else detail = `Em ${Math.round(diffMins / 1440)} dia(s)`
      } else {
        detail = 'Aguardando envio'
      }

      return {
        id: l.id,
        lead_id: l.id,
        initial: name[0].toUpperCase(),
        name,
        detail,
        profile_pic_url: l.profile_pic_url || null,
        follow_up_count: l.follow_up_count || 0,
      }
    })

    // Origins
    const sourceCounts: Record<string, number> = {}
    sourceData?.forEach((l: any) => {
      const src = l.source || 'manual'
      sourceCounts[src] = (sourceCounts[src] || 0) + 1
    })
    const totalSources = Object.values(sourceCounts).reduce((a, b) => a + b, 0) || 1
    const originArr: OriginData[] = Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([src, count]) => ({
        source: src,
        count,
        pct: Math.round((count / totalSources) * 100),
      }))

    const finalOrigins = originArr

    setMetrics({
      leadsNovos: leadsNovos || 0,
      emConversa: emConversa || 0,
      callsAgendadas: callsAgendadas || 0,
      taxaResposta: Math.round((emConversa || 0) / total * 100),
      taxaAgendamento: Math.round(withCall / total * 100),
      taxaFechamento: withCall > 0 ? Math.round(closed / withCall * 100) : 0,
    })
    setFunnel(funnelData)
    setChartBars(bars)
    setChartTitle(cTitle)
    setChartBadge(cBadge)
    setActivities(finalActivities)
    setFollowUps(finalFollowUps)
    setOrigins(finalOrigins)
    hasLoadedRef.current = true
    setInitialLoading(false)
    setReloading(false)
  }, [])

  // Initial load + auto-refresh every 60s
  useEffect(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    loadData({ from: todayStart, to: todayEnd }, 'Hoje')

    const interval = setInterval(() => {
      if (lastRangeRef.current) {
        loadData(lastRangeRef.current.range)
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  const funnelMax = useMemo(() => Math.max(...funnel.map(f => f.count), 1), [funnel])
  const chartMax = useMemo(() => Math.max(...chartBars.map(b => b.value), 1), [chartBars])

  // Safe metrics with defaults
  const m = metrics || {
    leadsNovos: 0, emConversa: 0, callsAgendadas: 0,
    taxaResposta: 0, taxaAgendamento: 0, taxaFechamento: 0,
  }

  /* ═══ Loading ═══ */
  if (initialLoading) {
    return (
      <div className="space-y-12">
        <div>
          <div className="h-9 w-64 skeleton-shimmer rounded-lg" />
          <div className="h-5 w-80 skeleton-shimmer rounded-lg mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[116px] rounded-[20px] skeleton-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 h-[380px] rounded-[14px] skeleton-shimmer" />
          <div className="lg:col-span-2 h-[380px] rounded-[20px] skeleton-shimmer" />
        </div>
      </div>
    )
  }

  /* ═══ Render ═══ */
  return (
    <div className={`space-y-6 sm:space-y-12 transition-opacity duration-200 ${reloading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      {/* Header & Period Filter */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#1B3A2D]">
            {getGreeting()}, {(profile?.name || 'Lukhas').split(' ')[0]}! 💪
          </h2>
          <p className="text-[#414844] opacity-80 font-normal mt-1">
            Monitore seu funil e atividades de hoje.
          </p>
        </div>
        <PeriodFilter onChange={loadData} activePeriod={periodLabel} />
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-[14px]">
        <KpiCard label="Leads Novos" value={m.leadsNovos} icon={UserPlus} href="/leads?stage=novo" />
        <KpiCard label="Em Conversa" value={m.emConversa} icon={MessageCircle} href="/leads?stage=rapport,social_selling,spin" />
        <KpiCard label="Calls Agendadas" value={m.callsAgendadas} icon={Calendar} href="/calls" />
        <KpiCard label="Taxa de Resposta" value={`${m.taxaResposta}%`} icon={Zap} showBar barPercent={m.taxaResposta} />
        <KpiCard label="Taxa Agendamento" value={`${m.taxaAgendamento}%`} icon={CalendarCheck} showBar barPercent={m.taxaAgendamento} />
        <KpiCard label="Taxa Fechamento" value={`${m.taxaFechamento}%`} icon={Target} showBar barPercent={m.taxaFechamento} />
      </section>

      {/* Funnel & Activities */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Funil de Vendas */}
        <div className="lg:col-span-3 bg-white p-5 sm:p-8 rounded-[14px] border-[0.5px] border-[#E5E7EB] relative" data-chart-container>
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#1B3A2D]">Funil de Vendas</h3>
            <a href="/pipeline" className="text-[12px] font-bold text-[#1B3A2D] hover:opacity-80 transition-opacity">Ver detalhes</a>
          </div>
          <div className="space-y-4">
            {funnel.map((item, i) => (
              <FunnelBar
                key={item.stage}
                label={item.stage}
                count={item.count}
                max={funnelMax}
                color={FUNNEL_COLORS[i] || '#1B3A2D'}
              />
            ))}
          </div>
        </div>

        {/* Atividades Recentes */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-[#111827]">Atividades Recentes</h3>
            <a className="text-[12px] font-semibold text-[#1B3A2D] hover:opacity-80 transition-opacity" href="/leads">Ver todas</a>
          </div>
          {activities.length > 0 ? (
            <div className="space-y-0">
              {activities.map((a) => {
                const cfg = getActivityConfig(a.action)
                // Display name: prefer name, fallback to @username
                const displayName = (a.lead_name && !a.lead_name.startsWith('ig_'))
                  ? a.lead_name
                  : (a.lead_username && !a.lead_username.startsWith('ig_'))
                    ? `@${a.lead_username}`
                    : 'Lead'
                const initial = displayName[0] === '@' ? displayName[1]?.toUpperCase() || '?' : displayName[0]?.toUpperCase() || '?'

                const detail = getActivityDetail(a.action, a.details)

                const timeAgo = (() => {
                  const date = new Date(a.created_at)
                  const diff = Date.now() - date.getTime()
                  const mins = Math.floor(diff / 60000)
                  if (mins < 0) {
                    // Future date — show the date itself
                    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  }
                  if (mins < 1) return 'agora'
                  if (mins < 60) return `há ${mins} min`
                  const hours = Math.floor(mins / 60)
                  if (hours < 24) return `há ${hours}h`
                  const days = Math.floor(hours / 24)
                  if (days === 1) return 'ontem'
                  if (days < 7) return `há ${days} dias`
                  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                })()

                return (
                  <div
                    key={a.id}
                    onClick={() => a.lead_id && router.push(`/leads/${a.lead_id}`)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-[#FAFBFC] -mx-2 px-2 py-3 rounded-xl transition-colors border-b border-[#F5F5F5] last:border-0"
                  >
                    {/* Avatar or icon */}
                    {a.lead_id ? (
                      <LeadAvatar name={a.lead_name} username={a.lead_username} photoUrl={a.lead_pic} size="md" />
                    ) : (
                      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${cfg.badgeColor.split(' ')[0]}`}>
                        <cfg.icon className={`w-4 h-4 ${cfg.badgeColor.split(' ')[1]}`} />
                      </div>
                    )}

                    {/* Title + detail */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] truncate">{displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[11px] text-[#9CA3AF] truncate">{detail}</p>
                        <span className="text-[#E5E7EB]">&middot;</span>
                        <span className="text-[10px] text-[#C0C7D0] flex-shrink-0">{timeAgo}</span>
                      </div>
                    </div>

                    {/* Badge */}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${cfg.badgeColor}`}>
                      {cfg.badge}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-[13px] text-[#9CA3AF]">Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </section>

      {/* Follow-ups */}
      <section className="bg-white border border-[#EFEFEF] rounded-[20px] p-5 sm:p-[24px_28px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[16px] font-bold text-[#0F172A]">Próximos Follow-ups</h3>
          <a href="/follow-up" className="text-[12px] font-bold text-[#1B3A2D] hover:opacity-80 transition-opacity">Ver todos</a>
        </div>
        {followUps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {followUps.map((f) => (
              <FollowUpCard
                key={f.id}
                initial={f.initial}
                name={f.name}
                detail={f.detail}
                profilePic={f.profile_pic_url}
                followUpCount={f.follow_up_count}
                onContact={() => f.lead_id && router.push(`/leads/${f.lead_id}?tab=conversa`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-[13px] text-[#9CA3AF]">Nenhum lead em follow-up no momento</p>
          </div>
        )}
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leads Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[14px] border-[0.5px] border-[#E5E7EB] relative" data-chart-container>
          <div className="flex justify-between items-start mb-6 sm:mb-8">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#111827]">{chartTitle}</h3>
            <div className="relative" ref={periodDropRef}>
              <button
                onClick={() => setPeriodDropOpen(!periodDropOpen)}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#F3F4F6] text-[#6B7280] text-[11px] sm:text-[12px] font-medium rounded-full hover:bg-[#EFEFEF] transition-colors"
              >
                {chartBadge}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${periodDropOpen ? 'rotate-180' : ''}`} />
              </button>
              {periodDropOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPeriodDropOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-[12px] border border-[#EFEFEF] shadow-[0_4px_24px_rgba(0,0,0,0.10)] py-1 w-[140px] z-50 animate-dropdown-in">
                    {QUICK_PERIODS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setPeriodDropOpen(false); loadData(p.range(), p.label) }}
                        className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${periodLabel === p.label ? 'text-[#111827] font-semibold bg-[#F7F8F9]' : 'text-[#374151] hover:bg-[#F7F8F9]'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="h-48 sm:h-64 flex">
            {/* Y-Axis */}
            <div className="flex flex-col justify-between py-0 pr-2 sm:pr-4 text-[10px] sm:text-[11px] text-[#9CA3AF] font-medium text-right h-[calc(100%-20px)]">
              <span>{chartMax}</span>
              <span>{Math.round(chartMax * 0.66)}</span>
              <span>{Math.round(chartMax * 0.33)}</span>
              <span>0</span>
            </div>
            {/* Chart */}
            <div className="flex-1 relative h-full">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between py-0 h-[calc(100%-20px)]">
                <div className="w-full border-t border-[#F3F4F6]" />
                <div className="w-full border-t border-[#F3F4F6]" />
                <div className="w-full border-t border-[#F3F4F6]" />
                <div className="w-full border-b border-[#F3F4F6]" />
              </div>
              {/* Bars — aligned with grid area */}
              <div className="absolute inset-x-0 top-0 flex items-end justify-between px-0.5 sm:px-2 gap-0.5 sm:gap-0 h-[calc(100%-20px)]">
                {chartBars.map((bar) => {
                  const pct = chartMax > 0 ? (bar.value / chartMax) * 100 : 0
                  return (
                    <div key={bar.label} className="flex flex-col items-center justify-end flex-1 h-full group">
                      <span className={`text-[11px] sm:text-[12px] font-bold mb-1.5 transition-colors duration-200 ${bar.value > 0 ? 'text-[#1B3A2D] group-hover:text-[#111827]' : 'text-[#D1D5DB]'}`}>
                        {bar.value}
                      </span>
                      <div
                        className="w-full max-w-[32px] bg-[#C8E645] rounded-t-[6px] transition-all duration-300 group-hover:brightness-105 cursor-default"
                        style={{ height: bar.value > 0 ? `${Math.max(pct, 4)}%` : '0%' }}
                      />
                    </div>
                  )
                })}
              </div>
              {/* X-axis labels */}
              <div className="absolute bottom-0 inset-x-0 flex justify-between px-0.5 sm:px-2 gap-0.5 sm:gap-0">
                {chartBars.map((bar) => (
                  <span key={bar.label} className="flex-1 text-center text-[10px] sm:text-[12px] text-[#9CA3AF] font-medium">{bar.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Origem dos Leads */}
        <div className="bg-white p-5 sm:p-8 rounded-[14px] border-[0.5px] border-[#E5E7EB]">
          <div className="flex justify-between items-start mb-6 sm:mb-8">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#111827]">Origem dos Leads</h3>
            <div className="relative" ref={originDropRef}>
              <button
                onClick={() => setOriginDropOpen(!originDropOpen)}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#F3F4F6] text-[#6B7280] text-[11px] sm:text-[12px] font-medium rounded-full hover:bg-[#EFEFEF] transition-colors"
              >
                {chartBadge}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${originDropOpen ? 'rotate-180' : ''}`} />
              </button>
              {originDropOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOriginDropOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-[12px] border border-[#EFEFEF] shadow-[0_4px_24px_rgba(0,0,0,0.10)] py-1 w-[140px] z-50 animate-dropdown-in">
                    {QUICK_PERIODS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setOriginDropOpen(false); loadData(p.range(), p.label) }}
                        className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${periodLabel === p.label ? 'text-[#111827] font-semibold bg-[#F7F8F9]' : 'text-[#374151] hover:bg-[#F7F8F9]'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="space-y-5">
            {origins.length > 0 ? origins.map((o) => {
              const cfg = SOURCE_CONFIG[o.source] || { icon: HelpCircle, color: '#6B7280', label: o.source }
              return <OriginRow key={o.source} icon={cfg.icon} color={cfg.color} name={cfg.label} count={o.count} pct={o.pct} />
            }) : (
              <>
                <OriginRow icon={Camera} color="#C8E645" name="Comentários" count={0} pct={0} />
                <OriginRow icon={MessageSquareText} color="#0D9488" name="Respostas de Story" count={0} pct={0} />
                <OriginRow icon={Send} color="#3B82F6" name="Mensagens Diretas" count={0} pct={0} />
                <OriginRow icon={UserPlus} color="#8B5CF6" name="Novos Seguidores" count={0} pct={0} />
                <OriginRow icon={Heart} color="#EC4899" name="Curtidas" count={0} pct={0} />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Floating AI Button */}
      <button className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 bg-[#1B3A2D] rounded-full shadow-[0_20px_40px_-5px_rgba(4,36,25,0.4)] flex items-center justify-center group hover:scale-110 active:scale-95 transition-all z-50 overflow-hidden">
        <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-[#C8E645] group-hover:rotate-12 transition-transform" />
        <span className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#6bff8f] rounded-full border-2 border-[#1B3A2D]" />
      </button>
    </div>
  )
}

/* ═══ Sub-components ═══ */

function FollowUpCard({ initial, name, detail, profilePic, followUpCount, onContact }: {
  initial: string; name: string; detail: string; profilePic?: string | null; followUpCount?: number; onContact?: () => void
}) {
  return (
    <div className="bg-[#F7F8F9] border border-[#EFEFEF] p-[14px_18px] rounded-[14px] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <LeadAvatar name={name} photoUrl={profilePic || null} size="md" />
        <div>
          <p className="text-[13px] font-semibold text-[#0F172A]">{name}</p>
          <p className="text-[11px] text-[#9CA3AF]">
            {followUpCount ? `#${followUpCount} · ` : ''}{detail}
          </p>
        </div>
      </div>
      <button
        onClick={onContact}
        className="bg-[#C8E645] text-[#1B3A2D] text-[11px] font-bold px-[14px] py-[6px] rounded-full uppercase tracking-[0.04em] shadow-[0_2px_8px_rgba(200,230,69,0.35)] hover:scale-105 active:scale-95 transition-transform"
      >
        Contatar
      </button>
    </div>
  )
}

function OriginRow({ icon: Icon, color, name, count, pct }: {
  icon: LucideIcon; color: string; name: string; count: number; pct: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[13px] font-semibold text-[#111827]">{name}</span>
          <span className="text-[13px] font-bold text-[#111827]">{count}</span>
        </div>
        <div className="w-full h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  )
}
