import { NextResponse } from 'next/server'
import { jsonError, requireUser } from '@/lib/apiAuth'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

// Lets someone remove themselves from a group they joined, so nobody is stuck
// seeing a group's members and events after they want out (App Store Review
// Guideline 1.2 expects people to be able to walk away from shared spaces).
//
// group_members has no "delete your own row" RLS policy, so the delete runs
// with the service role, scoped to exactly this caller's own membership row.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: members, error: readError } = await supabase
    .from('group_members')
    .select('user_id, role')
    .eq('group_id', params.id)
  if (readError) return jsonError(readError.message, 500)

  const mine = members?.find((m) => m.user_id === user.id)
  if (!mine) return NextResponse.json({ ok: true }) // already out

  const leaders = (members ?? []).filter((m) => m.role === 'leader')
  const others = (members ?? []).filter((m) => m.user_id !== user.id)
  if (mine.role === 'leader' && leaders.length === 1 && others.length > 0) {
    return jsonError("You're this group's only leader, so leaving would leave it with nobody to run it.", 409)
  }

  const admin = createServiceRoleSupabase()
  const { error } = await admin.from('group_members').delete().eq('group_id', params.id).eq('user_id', user.id)
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.group.left',
    entityType: 'group',
    entityId: params.id,
  })

  return NextResponse.json({ ok: true })
}
