import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { revokeActiveShortcutSessions } from '@/lib/shortcutSession'
import { logAudit } from '@/lib/audit'

// POST /api/campaigns/[id]/pause
//
// Important honesty note (see docs/APPLE_SHORTCUTS.md): this cannot reach
// into a Shortcut that's already mid-run on the phone — there is no
// supported way for a web app to interrupt a running Shortcut. What it does
// do: revoke the active session so the next progress webhook call the
// Shortcut makes returns continue:false (the Shortcut is built to check this
// after every send and stop looping), and prevent any new chunk from being
// fetched. In the worst case, a small number of already-claimed sends finish
// out before the Shortcut notices.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('status')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()
  if (!campaign) return jsonError('Campaign not found', 404)
  if (!['queued', 'sending'].includes(campaign.status)) {
    return jsonError(`Campaign is "${campaign.status}" — nothing to pause.`, 409)
  }

  await revokeActiveShortcutSessions(supabase, params.id)

  const { data: updated, error } = await supabase
    .from('campaigns')
    .update({ status: 'paused' })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'campaign.paused', entityType: 'campaign', entityId: params.id })

  return NextResponse.json({ campaign: updated })
}
