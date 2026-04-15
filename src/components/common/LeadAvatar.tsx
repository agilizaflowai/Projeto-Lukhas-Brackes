'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface LeadAvatarProps {
  name: string | null
  username?: string | null
  photoUrl: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: { container: 'w-6 h-6', text: 'text-[8px]' },
  sm: { container: 'w-8 h-8', text: 'text-[10px]' },
  md: { container: 'w-10 h-10', text: 'text-[13px]' },
  lg: { container: 'w-12 h-12', text: 'text-[14px]' },
  xl: { container: 'w-16 h-16', text: 'text-[20px]' },
}

function getInitials(name: string | null, username?: string | null): string {
  if (name && !name.startsWith('ig_') && !/^\d{10,}$/.test(name)) {
    return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)
  }
  if (username && !username.startsWith('ig_') && !/^\d{10,}$/.test(username)) {
    return username.slice(0, 2).toUpperCase()
  }
  return '?'
}

export function LeadAvatar({ name, username, photoUrl, size = 'md', className }: LeadAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const s = sizes[size]
  const initials = getInitials(name, username)
  const showInitials = !photoUrl || imgError

  return (
    <div className={cn(s.container, 'rounded-full flex-shrink-0 overflow-hidden', className)}>
      {showInitials ? (
        <div className={cn(
          'w-full h-full bg-[#C8E645]/15 flex items-center justify-center font-bold text-[#7A9E00]',
          s.text
        )}>
          {initials}
        </div>
      ) : (
        <img
          src={photoUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      )}
    </div>
  )
}
