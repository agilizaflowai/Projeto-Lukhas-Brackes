'use client'

import { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/common/Sidebar'
import { TopBar } from '@/components/common/TopBar'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingMessages, setPendingMessages] = useState(0)
  const [pendingTasks, setPendingTasks] = useState(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  // Adapt user to profile shape used by Sidebar/TopBar
  const profile = user ? {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'admin' | 'operator',
    avatar: user.avatar_url || null,
    created_at: '',
  } : null

  useEffect(() => {
    if (supabaseRef.current) return

    const supabase = createClient()
    supabaseRef.current = supabase

    async function loadCounts() {
      const [msgs, tasks] = await Promise.all([
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setPendingMessages(msgs.count || 0)
      setPendingTasks(tasks.count || 0)
    }

    loadCounts()

    channelRef.current = supabase
      .channel('badge-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadCounts())
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        supabaseRef.current = null
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8faf7]">
        <div className="w-8 h-8 border-3 border-[#C8E645]/30 border-t-[#C8E645] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8faf7]">
      <Sidebar
        role={profile?.role}
        pendingMessages={pendingMessages}
        pendingTasks={pendingTasks}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        profile={profile}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-[220px]">
        <TopBar profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
