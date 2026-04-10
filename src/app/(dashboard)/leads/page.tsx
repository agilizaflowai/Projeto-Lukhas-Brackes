'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, ExternalLink, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { STAGE_COLORS } from '@/lib/stage-colors'
import { EmptyState } from '@/components/common/EmptyState'
import type { Lead, LeadStage } from '@/lib/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('leads').select('*').order('created_at', { ascending: false }).then(({ data }: { data: any }) => {
      if (data) setLeads(data)
      setLoading(false)
    })
  }, [])

  const filtered = leads.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      if (!l.name?.toLowerCase().includes(q) && !l.instagram_username.toLowerCase().includes(q)) return false
    }
    if (filterStage && l.stage !== filterStage) return false
    return true
  })

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>Leads</h1>
      <p className="text-muted-foreground mb-4">Todos os leads cadastrados</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStage} onChange={e => setFilterStage(e.target.value)}>
          <option value="">Todas etapas</option>
          {Object.entries(STAGE_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-16" />)}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0f1225]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Lead</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Etapa</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Origem</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Responsável</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Criado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-white/[0.03] transition-colors duration-100">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {lead.profile_pic_url ? (
                          <img src={lead.profile_pic_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">{(lead.name || lead.instagram_username)[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{lead.name || `@${lead.instagram_username}`}</p>
                        <p className="text-xs text-muted-foreground">@{lead.instagram_username}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage].bg} ${STAGE_COLORS[lead.stage].text}`}>
                      {STAGE_COLORS[lead.stage].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell capitalize">{lead.source || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell capitalize">{lead.assigned_to}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatDistanceToNow(new Date(lead.created_at), { locale: ptBR, addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`https://instagram.com/${lead.instagram_username}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6}><EmptyState icon={Users} title="Nenhum lead encontrado" description="Tente ajustar os filtros ou aguarde novos leads." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
