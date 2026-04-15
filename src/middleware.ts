import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get('auth-user')?.value
  const isLogin = req.nextUrl.pathname === '/login'
  const isApi = req.nextUrl.pathname.startsWith('/api')
  const isPublic = req.nextUrl.pathname.startsWith('/politicas-privacidade')

  if (isApi || isPublic) return NextResponse.next()

  if (!cookie && !isLogin) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (cookie && isLogin) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
