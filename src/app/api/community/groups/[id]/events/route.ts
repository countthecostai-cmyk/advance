import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/apiAuth'
import { requireOrgContext } from '@/lib/community/requireOrg'
import { createEventSchema } from '@/lib/community/validation'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrgContext()
  if ('error' in auth) return auth.error
  const { supabase, orgId, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const startsAt = new Date(parsed.data.starts_at)
  if (Number.isNaN(startsAt.getTime())) return jsonError('Invalid date/time')

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      organization_id: orgId,
      group_id: params.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      starts_at: startsAt.toISOString(),
      created_by: user.id,
    })
    .select()
    .single()
  if (error || !event) return jsonError(error?.message ?? 'Could not create event', 500)

  // Seed a no_response RSVP row for every current group member so leaders
  // immediately see who hasn't answered.
  const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', params.id)
  if (members?.length) {
    await supabase
      .from('rsvps')
      .insert(members.map((m) => ({ event_id: event.id, user_id: m.user_id, status: 'no_response' as const })))
  }

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.event.created',
    entityType: 'event',
    entityId: event.id,
  })

  return NextResponse.json({ event }, { status: 201 })
}
