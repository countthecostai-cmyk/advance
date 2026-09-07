import { NextResponse } from 'next/server'
import { jsonError } from '@/lib/apiAuth'
import { requireOrgContext } from '@/lib/community/requireOrg'
import { logAudit } from '@/lib/audit'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireOrgContext()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { error } = await supabase.from('group_members').insert({ group_id: params.id, user_id: user.id, role: 'member' })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true }) // already a member
    return jsonError(error.message, 500)
  }

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.group.joined',
    entityType: 'group',
    entityId: params.id,
  })

  return NextResponse.json({ ok: true })
}
