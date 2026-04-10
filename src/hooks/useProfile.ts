'use client'

import { useEffect, useState } from 'react'
import type { Profile } from '@/lib/types'

// TODO: Restaurar autenticação Supabase quando estiver configurado
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lê o email do cookie demo-email
    const email = document.cookie
      .split('; ')
      .find((row) => row.startsWith('demo-email='))
      ?.split('=')[1] || 'usuario@demo.com'

    setProfile({
      id: 'demo-user',
      email: decodeURIComponent(email),
      name: decodeURIComponent(email).split('@')[0],
      role: 'admin',
      avatar: null,
      created_at: new Date().toISOString(),
    })
    setLoading(false)
  }, [])

  return { profile, loading }
}
