// Auth is now handled by /api/auth/* routes and src/middleware.ts
// This file is kept for compatibility but not used
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request })
}
