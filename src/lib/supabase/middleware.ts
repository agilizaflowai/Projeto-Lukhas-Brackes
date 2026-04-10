import { NextResponse, type NextRequest } from 'next/server'

// TODO: Restaurar autenticação Supabase quando estiver configurado
export async function updateSession(request: NextRequest) {
  const loggedIn = request.cookies.get('demo-session')?.value === 'true'

  // Not logged in and not on login/politicas page → redirect to login
  if (
    !loggedIn &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/politicas-privacidade')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged in and on login page → redirect to dashboard
  if (loggedIn && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
