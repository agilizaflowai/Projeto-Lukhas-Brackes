'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/common/Sidebar'
import { TopBar } from '@/components/common/TopBar'
import { useProfile } from '@/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingMessages, setPendingMessages] = useState(0)
  const [pendingTasks, setPendingTasks] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function loadCounts() {
      const [msgs, tasks] = await Promise.all([
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setPendingMessages(msgs.count || 0)
      setPendingTasks(tasks.count || 0)
    }

    loadCounts()

    // Realtime para atualizar badges
    const channel = supabase
      .channel('badge-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadCounts())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={profile?.role}
        pendingMessages={pendingMessages}
        pendingTasks={pendingTasks}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        profile={profile}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
