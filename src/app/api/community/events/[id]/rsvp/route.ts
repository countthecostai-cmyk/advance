import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/apiAuth'
import { requireOrgContext } from '@/lib/community/requireOrg'
import { setRsvpSchema } from '@/lib/community/validation'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrgContext()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = setRsvpSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const { error } = await supabase.from('rsvps').upsert(
    {
      event_id: params.id,
      user_id: user.id,
      status: parsed.data.status,
      responded_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,user_id' }
  )
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.rsvp.set',
    entityType: 'event',
    entityId: params.id,
    metadata: { status: parsed.data.status },
  })

  return NextResponse.json({ ok: true })
}
