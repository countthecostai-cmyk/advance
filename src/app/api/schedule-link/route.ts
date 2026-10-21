import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { createScheduleToken } from '@/lib/scheduleToken'

async function build(userId: string, reset: boolean) {
  const admin = createServiceRoleSupabase()
  const { data } = await admin
    .from('profiles')
    .select('schedule_nonce, schedule_last_checked_at' as '*')
    .eq('id', userId)
    .single()
  const row = data as unknown as { schedule_nonce: string | null; schedule_last_checked_at: string | null }
  let nonce = row.schedule_nonce
  if (!nonce || reset) {
    nonce = randomBytes(12).toString('hex')
    await admin.from('profiles').update({ schedule_nonce: nonce } as never).eq('id', userId)
  }
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  return {
    url: `${appUrl}/api/shortcut/due/${createScheduleToken(userId, nonce)}`,
    last_checked_at: reset ? null : row.schedule_last_checked_at,
  }
}

// GET: this person's automation link (created on first use) + when their phone last checked.
export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  return NextResponse.json(await build(auth.user.id, false))
}

// POST { reset: true }: invalidate the old link and make a new one.
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => ({}))
  return NextResponse.json(await build(auth.user.id, body?.reset === true))
}
