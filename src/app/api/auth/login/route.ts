import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
  }

  const { data: user } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const userData = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  })

  response.cookies.set('auth-user', userData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}
