import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// TODO: Remover mock quando Supabase estiver configurado
function createMockClient() {
  const emptyResponse = { data: null, error: null, count: 0 }

  const chainable = (): any => {
    const promise = Promise.resolve(emptyResponse)
    const handler: any = Object.assign(promise, {})
    for (const method of [
      'select', 'insert', 'update', 'upsert', 'delete',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
      'is', 'in', 'contains', 'containedBy', 'filter',
      'not', 'or', 'and', 'match',
      'order', 'limit', 'range', 'single', 'maybeSingle',
      'csv', 'returns',
    ]) {
      handler[method] = (..._args: any[]) => chainable()
    }
    return handler
  }

  return {
    from: () => chainable(),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    rpc: () => Promise.resolve(emptyResponse),
  } as any
}

export async function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createMockClient()
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  )
}
