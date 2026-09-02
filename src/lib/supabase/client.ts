'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'

// One browser client per module load, reused across the app. Auth tokens are
// persisted in cookies (not localStorage) by @supabase/ssr so the session
// also flows into server components/route handlers and survives being
// launched as a standalone Home Screen app.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
