'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, ArrowRight } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import type { Lead } from '@/lib/types'

export default function FollowUpPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('leads')
      .select('*')
      .eq('stage', 'follow_up')
      .eq('is_active', true)
      .order('next_follow_up_at', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (data) setLeads(data)
        setLoading(false)
      })
  }, [])

  async function moveToRapport(leadId: string) {
    await supabase.from('leads').update({
      stage: 'rapport',
      stage_changed_at: new Date().toISOString(),
    }).eq('id', leadId)
    setLeads(prev => prev.filter(l => l.id !== leadId))
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Follow-up</h1>
      </div>
      <p className="text-muted-foreground mb-4">Leads em follow-up automatico aguardando reengajamento</p>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-20" />)}</div>
      ) : leads.length === 0 ? (
        <EmptyState icon={RefreshCw} title="Nenhum lead em follow-up" description="Leads em follow-up automatico aparecerao aqui." />
      ) : (
        <div className="space-y-3">
          {leads.map(lead => {
            const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date()
            return (
              <Card key={lead.id} className="hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {lead.profile_pic_url ? (
                      <img src={lead.profile_pic_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{(lead.name || lead.instagram_username)[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-sm hover:underline">
                      {lead.name || `@${lead.instagram_username}`}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Follow-up #{lead.follow_up_count}</span>
                      {lead.next_follow_up_at && (
                        <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                          {isOverdue ? 'Atrasado' : 'Proximo'}: {format(new Date(lead.next_follow_up_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {lead.last_interaction_at && (
                        <span>Ultima interacao {formatDistanceToNow(new Date(lead.last_interaction_at), { locale: ptBR, addSuffix: true })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                      {isOverdue ? 'Atrasado' : 'Agendado'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => moveToRapport(lead.id)}>
                      <ArrowRight className="w-3.5 h-3.5" /> Reativar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
