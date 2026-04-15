'use client'

import { useAuth } from '@/hooks/useAuth'
import { Menu, LogOut } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { SearchDropdown } from './SearchDropdown'
import { NotificationPopover } from './NotificationPopover'

interface TopBarProps {
  profile: Profile | null
  onMenuClick: () => void
}

export function TopBar({ profile, onMenuClick }: TopBarProps) {
  const { logout } = useAuth()

  return (
    <header className="h-[64px] sticky top-0 z-40 bg-white border border-[#EFEFEF] rounded-[16px] mx-4 mt-3 px-5 flex justify-between items-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] shrink-0">
      {/* Mobile menu */}
      <button onClick={onMenuClick} className="lg:hidden text-[#414844] hover:text-[#1B3A2D] transition-colors">
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <SearchDropdown />

      <div className="flex items-center">
        {/* Notifications */}
        <NotificationPopover />

        {/* Divider */}
        <div className="w-[1px] h-[20px] bg-[#EFEFEF] mx-3 hidden sm:block" />

        {/* User */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-bold text-[#0F172A] leading-tight">
              {profile?.name || profile?.email || 'Usuário'}
            </p>
            <p className="text-[10px] font-medium text-[#9CA3AF] tracking-[0.06em] uppercase">
              {profile?.role === 'admin' ? 'Administrador' : 'Operador'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full border-2 border-[#C8E645] bg-[#1B3A2D] flex items-center justify-center text-[#C8E645] text-xs font-bold shrink-0">
            {(profile?.name || profile?.email || '?')[0].toUpperCase()}
          </div>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-[20px] bg-[#EFEFEF] mx-2 sm:mx-3 hidden sm:block" />

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#EFEFEF] bg-transparent text-[#9CA3AF] text-[12px] font-medium hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#EF4444] transition-all group"
        >
          <LogOut className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#EF4444]" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
