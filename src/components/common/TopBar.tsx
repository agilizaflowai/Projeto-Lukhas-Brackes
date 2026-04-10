'use client'

import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { Menu, LogOut } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface TopBarProps {
  profile: Profile | null
  onMenuClick: () => void
}

export function TopBar({ profile, onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[#1a1f3e] bg-[#0c0e1a]/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden text-slate-400 hover:text-slate-200 transition-colors">
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <span className="text-[13px] text-slate-400">{profile?.name || profile?.email}</span>
        <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs font-bold ring-2 ring-emerald-400/30">
          {(profile?.name || profile?.email || '?')[0].toUpperCase()}
        </div>
        <form action={logout}>
          <Button variant="ghost" size="icon" type="submit" title="Sair" className="opacity-50 hover:opacity-100 transition-all duration-150">
            <LogOut className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </header>
  )
}
