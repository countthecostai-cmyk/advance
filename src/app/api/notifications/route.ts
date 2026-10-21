import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { untyped } from '@/lib/untyped'

// POST marks all of the caller's notifications as read.
export async function POST() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth
  const { error } = await untyped(supabase)
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
