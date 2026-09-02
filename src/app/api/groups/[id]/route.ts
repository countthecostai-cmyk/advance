import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { groupInputSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = groupInputSchema.partial().safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const { data: group, error } = await supabase
    .from('contact_groups')
    .update(parsed.data)
    .eq('user_id', user.id)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return jsonError('A group with this name already exists', 409)
    return jsonError(error.message, 500)
  }
  if (!group) return jsonError('Group not found', 404)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'group.renamed', entityType: 'contact_group', entityId: params.id })

  return NextResponse.json({ group })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { error } = await supabase.from('contact_groups').delete().eq('user_id', user.id).eq('id', params.id)
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'group.deleted', entityType: 'contact_group', entityId: params.id })

  return NextResponse.json({ ok: true })
}
