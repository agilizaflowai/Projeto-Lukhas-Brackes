'use client'

import { useAuth } from './useAuth'
import type { Profile } from '@/lib/types'

export function useProfile() {
  const { user, loading } = useAuth()

  const profile: Profile | null = user ? {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'admin' | 'operator',
    avatar: user.avatar_url || null,
    created_at: '',
  } : null

  return { profile, loading }
}
