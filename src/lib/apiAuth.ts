import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types/database.types'

/**
 * Every authenticated API route starts by calling this. It re-verifies the
 * session server-side (never trusts a client-supplied user id) and loads the
 * account's profile/limits in the same round trip.
 */
export async function requireUser() {
  const supabase = createServerSupabase()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) } as const
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }) } as const
  }

  return { supabase, user, profile: profile as Profile } as const
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
