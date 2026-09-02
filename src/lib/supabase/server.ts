import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// Request-scoped client that respects the signed-in user's session and Row
// Level Security. Use this for every route handler and server component that
// acts "as the user."
export function createServerSupabase() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component render; the middleware refresh
            // path handles cookie writes there. Safe to ignore.
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // See above.
          }
        },
      },
    }
  )
}

// Elevated client that bypasses RLS using the service-role key. Never expose
// this to the client bundle (it's only importable from server-only files —
// route handlers under src/app/api and nothing under 'use client').
//
// Use ONLY for the narrow set of operations that must legitimately cross the
// RLS boundary:
//   - the Shortcut webhook endpoints (authenticated by a signed token, not a
//     Supabase session — see src/lib/shortcutToken.ts)
//   - the public opt-out endpoint (unauthenticated by design)
// Every use must re-derive and check the owning user_id in application code
// before touching a row.
export function createServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server')
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Shared alias for "a Supabase client typed against our schema," used by
// every helper in src/lib that accepts a client as a parameter (it's passed
// either a request-scoped session client or the service-role client — both
// factories above resolve to this same instantiation). Derived from the
// actual factory return type rather than hand-reconstructed with
// `SupabaseClient<Database, ...>` generics directly, since that class's
// generic parameter shape has changed across supabase-js major versions and
// inference from a real call site is what stays correct regardless.
export type AppSupabaseClient = ReturnType<typeof createServerSupabase>
