'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Phone } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import type { Call } from '@/lib/types'

const RESULT_LABELS: Record<string, string> = {
  fechou: 'Fechou',
  nao_fechou: 'Nao Fechou',
  reagendar: 'Reagendar',
  no_show: 'No Show',
}

const RESULT_COLORS: Record<string, string> = {
  fechou: 'bg-green-100 text-green-800',
  nao_fechou: 'bg-red-100 text-red-800',
  reagendar: 'bg-yellow-100 text-yellow-800',
  no_show: 'bg-slate-100 text-slate-800',
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('calls')
      .select('*, lead:leads(id, name, instagram_username)')
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (data) setCalls(data as Call[])
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>Calls</h1>
      <p className="text-muted-foreground mb-4">Historico de calls agendadas e realizadas</p>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-20" />)}</div>
      ) : calls.length === 0 ? (
        <EmptyState icon={Phone} title="Nenhuma call registrada" description="Quando calls forem agendadas, elas aparecerao aqui." />
      ) : (
        <div className="space-y-3">
          {calls.map(call => (
            <Card key={call.id} className="hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {call.lead ? (
                      <Link href={`/leads/${call.lead.id}`} className="font-medium text-sm hover:underline">
                        {call.lead.name || `@${call.lead.instagram_username}`}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">Lead removido</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {call.scheduled_at ? format(new Date(call.scheduled_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR }) : 'Sem data'}
                    {call.duration_minutes ? ` · ${call.duration_minutes} min` : ''}
                    {call.ai_analysis?.score != null ? ` · Score: ${call.ai_analysis.score}/10` : ''}
                  </p>
                </div>
                {call.result && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RESULT_COLORS[call.result] || ''}`}>
                    {RESULT_LABELS[call.result] || call.result}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
