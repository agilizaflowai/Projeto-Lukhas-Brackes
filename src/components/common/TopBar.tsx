'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Menu, LogOut, Search, X } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SearchDropdown } from './SearchDropdown'
import { NotificationPopover } from './NotificationPopover'

interface TopBarProps {
  profile: Profile | null
  onMenuClick: () => void
}

export function TopBar({ profile, onMenuClick }: TopBarProps) {
  const { logout } = useAuth()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // Lock body scroll while mobile search overlay open
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (mobileSearchOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [mobileSearchOpen])

  // Close search overlay with Escape
  useEffect(() => {
    if (!mobileSearchOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileSearchOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileSearchOpen])

  const displayName = profile?.name || profile?.email || 'Usuário'
  const roleLabel = profile?.role === 'admin' ? 'Administrador' : 'Operador'
  const initial = (profile?.name || profile?.email || 'U')[0].toUpperCase()

  return (
    <header
      className={cn(
        'relative sticky top-0 z-40 bg-white border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] shrink-0',
        'rounded-[14px] sm:rounded-[16px] mx-2 sm:mx-4 mt-2 sm:mt-3',
        'h-[60px] lg:h-[64px]',
      )}
    >
      {/* Main bar */}
      <div
        className={cn(
          'flex items-center h-full',
          'px-3 sm:px-4 lg:px-5',
          'gap-2 sm:gap-3 lg:gap-4',
          mobileSearchOpen && 'sm:flex hidden',
        )}
      >
        {/* Hamburger — mobile/tablet */}
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="lg:hidden w-9 h-9 rounded-full hover:bg-[#F7F8F9] flex items-center justify-center text-[#414844] transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search — desktop/tablet inline */}
        <div className="hidden sm:block flex-1 min-w-0 max-w-[320px] md:max-w-[400px] lg:max-w-[440px]">
          <SearchDropdown />
        </div>

        {/* Search — mobile icon */}
        <button
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Buscar"
          className="sm:hidden w-9 h-9 rounded-full hover:bg-[#F7F8F9] flex items-center justify-center text-[#6B7280] transition-colors flex-shrink-0"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Spacer pushes right group to end on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Right group */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 ml-auto flex-shrink-0">
          <NotificationPopover />

          {/* Vertical divider — desktop */}
          <div className="hidden lg:block w-px h-5 bg-[#EFEFEF]" />

          {/* User name + role — md+ */}
          <div className="hidden md:block text-right max-w-[160px]">
            <p className="text-[13px] font-bold text-[#0F172A] leading-tight truncate">
              {displayName}
            </p>
            <p className="text-[10px] font-medium text-[#9CA3AF] tracking-[0.06em] uppercase">
              {roleLabel}
            </p>
          </div>

          {/* Avatar — always visible */}
          <div className="w-9 h-9 rounded-full border-2 border-[#C8E645] bg-[#1B3A2D] flex items-center justify-center text-[#C8E645] text-xs font-bold flex-shrink-0">
            {initial}
          </div>

          {/* Vertical divider — desktop */}
          <div className="hidden lg:block w-px h-5 bg-[#EFEFEF]" />

          {/* Logout */}
          <button
            onClick={logout}
            aria-label="Sair"
            title="Sair"
            className="flex items-center gap-1.5 px-2 lg:px-3.5 py-1.5 rounded-full border border-transparent lg:border-[#EFEFEF] bg-transparent text-[#9CA3AF] text-[12px] font-medium hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#EF4444] transition-all group flex-shrink-0"
          >
            <LogOut className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-[#9CA3AF] group-hover:text-[#EF4444]" />
            <span className="hidden lg:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Mobile search overlay — replaces topbar contents */}
      {mobileSearchOpen && (
        <div className="sm:hidden absolute inset-0 z-50 bg-white rounded-[14px] flex items-center px-3 gap-2">
          <button
            onClick={() => setMobileSearchOpen(false)}
            aria-label="Fechar busca"
            className="w-9 h-9 rounded-full hover:bg-[#F7F8F9] flex items-center justify-center text-[#6B7280] flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <SearchDropdown forceMobile autoFocus onClose={() => setMobileSearchOpen(false)} />
          </div>
        </div>
      )}
    </header>
  )
}
