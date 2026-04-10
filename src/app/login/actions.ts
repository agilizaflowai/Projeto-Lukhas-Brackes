'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// TODO: Restaurar autenticação Supabase quando estiver configurado
export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Preencha todos os campos' }
  }

  // Aceita qualquer credencial por enquanto
  const cookieStore = await cookies()
  cookieStore.set('demo-session', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  })
  cookieStore.set('demo-email', email, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('demo-session')
  cookieStore.delete('demo-email')
  redirect('/login')
}
