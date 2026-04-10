import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// TODO: Remover mock quando Supabase estiver configurado
function createMockClient() {
  const emptyResponse = { data: null, error: null, count: 0 }

  const chainable = (): any => {
    const promise = Promise.resolve(emptyResponse)
    const handler: any = Object.assign(promise, {})
    // Todos os métodos de query retornam o próprio chainable
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
    channel: () => ({
      on: function () { return this },
      subscribe: () => {},
    }),
    removeChannel: () => {},
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    rpc: () => Promise.resolve(emptyResponse),
  } as any
}

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createMockClient()
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
