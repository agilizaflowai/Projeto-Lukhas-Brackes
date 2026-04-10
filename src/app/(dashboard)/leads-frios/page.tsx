'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, ExternalLink, Snowflake } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import type { Lead } from '@/lib/types'

export default function LeadsFriosPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('leads')
      .select('*')
      .eq('stage', 'lead_frio')
      .order('created_at', { ascending: false })
      .then(({ data }: { data: any }) => {
        if (data) setLeads(data)
        setLoading(false)
      })
  }, [])

  const filtered = leads.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.name?.toLowerCase().includes(q) || l.instagram_username.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Snowflake className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Leads Frios</h1>
      </div>
      <p className="text-muted-foreground mb-4">Leads que ainda nao entraram no funil ativo</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-16" />)}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0f1225]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Lead</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Origem</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Responsavel</th>
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
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">{lead.source || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">{lead.assigned_to}</td>
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
                <tr><td colSpan={5}><EmptyState icon={Snowflake} title="Nenhum lead frio encontrado" description="Leads frios aparecerao aqui quando forem identificados." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
