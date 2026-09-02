import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { revokeActiveShortcutSessions } from '@/lib/shortcutSession'
import { logAudit } from '@/lib/audit'

// POST /api/campaigns/[id]/stop — terminal. Every recipient still pending or
// claimed is marked 'stopped' and will never be picked up by any future
// Shortcut run for this campaign (a new campaign would have to be created to
// message them). Same in-flight caveat as pause applies.
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
  if (!['ready', 'queued', 'sending', 'paused'].includes(campaign.status)) {
    return jsonError(`Campaign is "${campaign.status}" — nothing to stop.`, 409)
  }

  await revokeActiveShortcutSessions(supabase, params.id)
  await supabase
    .from('campaign_recipients')
    .update({ status: 'stopped' })
    .eq('campaign_id', params.id)
    .in('status', ['pending', 'claimed'])

  const { data: updated, error } = await supabase
    .from('campaigns')
    .update({ status: 'stopped', completed_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return jsonError(error.message, 500)

  await supabase.rpc('recompute_campaign_progress', { p_campaign_id: params.id })

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'campaign.stopped', entityType: 'campaign', entityId: params.id })

  return NextResponse.json({ campaign: updated })
}
