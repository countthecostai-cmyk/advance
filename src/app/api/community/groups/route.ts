import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/apiAuth'
import { requireOrgContext } from '@/lib/community/requireOrg'
import { createGroupSchema } from '@/lib/community/validation'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const auth = await requireOrgContext()
  if ('error' in auth) return auth.error
  const { supabase, orgId } = auth

  const { data: groups, error } = await supabase
    .from('groups')
    .select('*, group_members(count)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return jsonError(error.message, 500)

  const shaped = (groups || []).map((g) => ({
    ...g,
    member_count: (g.group_members as unknown as { count: number }[])?.[0]?.count ?? 0,
    group_members: undefined,
  }))

  return NextResponse.json({ groups: shaped })
}

export async function POST(request: NextRequest) {
  const auth = await requireOrgContext()
  if ('error' in auth) return auth.error
  const { supabase, orgId, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = createGroupSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      organization_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      group_type: parsed.data.group_type,
      meeting_schedule: parsed.data.meeting_schedule || null,
      location: parsed.data.location || null,
      created_by: user.id,
    })
    .select()
    .single()
  if (error || !group) return jsonError(error?.message ?? 'Could not create group', 500)

  await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'leader' })

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.group.created',
    entityType: 'group',
    entityId: group.id,
  })

  return NextResponse.json({ group }, { status: 201 })
}
