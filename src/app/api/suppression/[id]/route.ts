import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { logAudit } from '@/lib/audit'

// DELETE /api/suppression/[id] — clears a suppression entry. This is an
// explicit, logged, account-owner-only action (see RLS policy
// suppression_delete_own) — re-subscribing a number is never something a
// campaign or import can do implicitly.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: entry } = await supabase.from('suppression_list').select('phone_number').eq('id', params.id).eq('user_id', user.id).maybeSingle()
  if (!entry) return jsonError('Not found', 404)

  const { error } = await supabase.from('suppression_list').delete().eq('id', params.id).eq('user_id', user.id)
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'suppression.removed',
    metadata: { phone_number: entry.phone_number },
  })

  return NextResponse.json({ ok: true })
}
