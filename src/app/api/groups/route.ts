import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { groupInputSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: groups, error } = await supabase
    .from('contact_groups')
    .select('*, contact_group_members(count)')
    .eq('user_id', user.id)
    .order('name')

  if (error) return jsonError(error.message, 500)

  const shaped = (groups || []).map((g: any) => ({
    ...g,
    member_count: g.contact_group_members?.[0]?.count ?? 0,
    contact_group_members: undefined,
  }))

  return NextResponse.json({ groups: shaped })
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = groupInputSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const { data: group, error } = await supabase
    .from('contact_groups')
    .insert({ user_id: user.id, name: parsed.data.name, color: parsed.data.color })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return jsonError('A group with this name already exists', 409)
    return jsonError(error.message, 500)
  }

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'group.created', entityType: 'contact_group', entityId: group.id })

  return NextResponse.json({ group }, { status: 201 })
}
