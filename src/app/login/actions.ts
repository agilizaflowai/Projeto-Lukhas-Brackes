'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  )
}

export async function login(_prev: { error: string } | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Preencha todos os campos' }
  }

  const supabase = getSupabase()

  const { data: user } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .single()

  if (!user) {
    return { error: 'Credenciais inválidas' }
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return { error: 'Credenciais inválidas' }
  }

  const userData = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  const cookieStore = await cookies()
  cookieStore.set('auth-user', userData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  redirect('/')
}
