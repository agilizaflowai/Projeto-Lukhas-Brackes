'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import {
  UserPlus, MessageSquare, Phone, TrendingUp, Target, CheckCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, Cell,
} from 'recharts'
import type { LeadStage } from '@/lib/types'

/* ═══ Constants ═══ */

const STAGE_LABELS: Record<string, string> = {
  novo: 'Novo', lead_frio: 'Lead Frio', rapport: 'Rapport',
  social_selling: 'Social Selling', spin: 'SPIN', call_agendada: 'Call Agendada',
  fechado: 'Fechado', perdido: 'Perdido', follow_up: 'Follow-up',
}

const FUNNEL_ORDER: LeadStage[] = [
  'novo', 'rapport', 'social_selling', 'spin', 'call_agendada', 'fechado',
]

/* ═══ Types ═══ */

interface Metrics {
  leadsHoje: number
  leadsSemana: number
  leadsAtivos: number
  callsAgendadas: number
  taxaResposta: number
  taxaAgendamento: number
  taxaFechamento: number
}

interface StageCount { stage: string; count: number; fill?: string }
interface WeekCount { week: string; count: number }

/* ═══ Custom Tooltip ═══ */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#151937] border border-[#2a2f5e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p
        className="text-sm font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: payload[0].color || '#39ff8e' }}
      >
        {payload[0].value}
      </p>
    </div>
  )
}

/* ═══ Framer Motion variants ═══ */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
}

/* ═══ Page ═══ */

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [funnel, setFunnel] = useState<StageCount[]>([])
  const [weekly, setWeekly] = useState<WeekCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
      const weekAhead = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()

      const [
        { count: leadsHoje },
        { count: leadsSemana },
        { count: leadsAtivos },
        { count: callsAgendadas },
        { data: allLeads },
        { data: stageData },
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('leads').select('id', { count: 'exact', head: true }).in('stage', ['rapport', 'social_selling', 'spin']).eq('is_active', true),
        supabase.from('calls').select('id', { count: 'exact', head: true }).gte('scheduled_at', now.toISOString()).lte('scheduled_at', weekAhead),
        supabase.from('leads').select('id, stage'),
        supabase.from('leads').select('stage'),
      ])

      const total = allLeads?.length || 1
      const comCall = allLeads?.filter(l => l.stage === 'call_agendada' || l.stage === 'fechado' || l.stage === 'perdido').length || 0
      const fechados = allLeads?.filter(l => l.stage === 'fechado').length || 0

      const stageCounts: Record<string, number> = {}
      stageData?.forEach(l => { stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1 })
      const funnelData = FUNNEL_ORDER.map(s => ({
        stage: STAGE_LABELS[s] || s,
        count: stageCounts[s] || 0,
        fill: s === 'fechado' ? '#e455a0' : '#39ff8e',
      }))

      const eightWeeksAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 56).toISOString()
      const { data: weeklyLeads } = await supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', eightWeeksAgo)
        .order('created_at', { ascending: true })

      const weekMap: Record<string, number> = {}
      weeklyLeads?.forEach(l => {
        const d = new Date(l.created_at)
        const ws = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
        const key = `${ws.getDate().toString().padStart(2, '0')}/${(ws.getMonth() + 1).toString().padStart(2, '0')}`
        weekMap[key] = (weekMap[key] || 0) + 1
      })
      const weeklyData = Object.entries(weekMap).map(([week, count]) => ({ week, count }))

      setMetrics({
        leadsHoje: leadsHoje || 0,
        leadsSemana: leadsSemana || 0,
        leadsAtivos: leadsAtivos || 0,
        callsAgendadas: callsAgendadas || 0,
        taxaResposta: Math.round((leadsAtivos || 0) / total * 100),
        taxaAgendamento: Math.round(comCall / total * 100),
        taxaFechamento: comCall > 0 ? Math.round(fechados / comCall * 100) : 0,
      })
      setFunnel(funnelData)
      setWeekly(weeklyData)
      setLoading(false)
    }

    load()
  }, [])

  /* ═══ Loading state ═══ */

  if (loading) {
    return (
      <div>
        <h1 className="text-[28px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Visao geral do funil de vendas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[120px] rounded-xl skeleton-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="h-[340px] rounded-xl skeleton-shimmer" />
          <div className="h-[340px] rounded-xl skeleton-shimmer" />
        </div>
      </div>
    )
  }

  /* ═══ Render ═══ */

  return (
    <div>
      {/* Header animado */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-[28px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visao geral do funil de vendas
        </p>
      </motion.div>

      {/* Grid de Metricas — staggered reveal */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6"
      >
        <motion.div variants={fadeUp}>
          <MetricCard title="Leads Hoje" value={metrics!.leadsHoje} subtitle={`${metrics!.leadsSemana} esta semana`} icon={UserPlus} glow />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Em Conversa Ativa" value={metrics!.leadsAtivos} icon={MessageSquare} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Calls Agendadas (7d)" value={metrics!.callsAgendadas} icon={Phone} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Taxa de Resposta" value={`${metrics!.taxaResposta}%`} icon={TrendingUp} color="accent" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Taxa de Agendamento" value={`${metrics!.taxaAgendamento}%`} icon={Target} color="accent" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Taxa de Fechamento" value={`${metrics!.taxaFechamento}%`} icon={CheckCircle} color="accent" />
        </motion.div>
      </motion.div>

      {/* Graficos — staggered */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6"
      >
        {/* Funil de Vendas */}
        <motion.div variants={fadeUp}>
          <div className="rounded-xl border border-[#1a1f3e] bg-[#0f1225] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Funil de Vendas
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1a1f3e" />
                  <XAxis
                    type="number"
                    tick={{ fill: '#4a4f70', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={110}
                    tick={{ fill: '#4a4f70', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(57,255,142,0.04)' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {funnel.map((entry, i) => (
                      <Cell key={i} fill={entry.fill || '#39ff8e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Leads por Semana */}
        <motion.div variants={fadeUp}>
          <div className="rounded-xl border border-[#1a1f3e] bg-[#0f1225] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Leads por Semana
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly}>
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#39ff8e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#39ff8e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1f3e" />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: '#4a4f70', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#4a4f70', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#39ff8e"
                    strokeWidth={2.5}
                    fill="url(#greenGradient)"
                    dot={{ fill: '#39ff8e', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#0f1225', fill: '#39ff8e' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
