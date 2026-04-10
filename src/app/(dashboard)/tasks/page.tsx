'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ListTodo, Check, SkipForward } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import type { Task } from '@/lib/types'

export default function TasksPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('tasks')
      .select('*, lead:leads(id, name, instagram_username)')
      .eq('status', 'pending')
      .order('due_at', { ascending: true, nullsFirst: false })

    if (data) setTasks(data as Task[])
    setLoading(false)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function markDone(id: string) {
    await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function markSkipped(id: string) {
    await supabase.from('tasks').update({ status: 'skipped', completed_at: new Date().toISOString() }).eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>Tarefas</h1>
      <p className="text-muted-foreground mb-4">Tarefas pendentes geradas pelo sistema</p>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-20" />)}</div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="Nenhuma tarefa pendente" description="Todas as tarefas foram concluidas. Bom trabalho!" />
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className="hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <Badge variant="secondary" className="text-[10px]">{task.type}</Badge>
                    </div>
                    {task.description && <p className="text-sm text-muted-foreground mb-1">{task.description}</p>}
                    {task.suggested_text && (
                      <div className="p-2 rounded-md bg-muted text-sm mb-2">
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Texto sugerido:</span>
                        {task.suggested_text}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.lead && (
                        <Link href={`/leads/${task.lead.id}`} className="hover:underline">
                          {task.lead.name || `@${task.lead.instagram_username}`}
                        </Link>
                      )}
                      {task.due_at && (
                        <span>Vence {formatDistanceToNow(new Date(task.due_at), { locale: ptBR, addSuffix: true })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => markDone(task.id)}>
                      <Check className="w-3.5 h-3.5" /> Feito
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => markSkipped(task.id)}>
                      <SkipForward className="w-3.5 h-3.5" /> Pular
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
