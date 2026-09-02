import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { checkDailySendCap } from '@/lib/rateLimit'
import { issueShortcutSession } from '@/lib/shortcutSession'
import { logAudit } from '@/lib/audit'

// POST /api/campaigns/[id]/resume — issues a fresh Shortcut session covering
// only the recipients still pending, and returns a new shortcuts:// launch
// URL. Used both to resume an explicitly paused campaign AND to continue a
// campaign whose Shortcut run finished a chunk but still has recipients left
// (chunk_size caps how many sends happen per Shortcut invocation — see
// docs/APPLE_SHORTCUTS.md) — either way, the user runs the Shortcut again.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user, profile } = auth

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()
  if (!campaign) return jsonError('Campaign not found', 404)
  if (!['paused', 'queued', 'sending'].includes(campaign.status)) {
    return jsonError(`Campaign is "${campaign.status}" — nothing left to continue.`, 409)
  }

  const remainingCount = campaign.recipient_count - campaign.processed_count - campaign.error_count - campaign.skipped_count
  if (remainingCount <= 0) {
    return jsonError('Every recipient has already reached a final status.', 409)
  }

  const { data: activeSession } = await supabase
    .from('shortcut_sessions')
    .select('id')
    .eq('campaign_id', campaign.id)
    .eq('status', 'active')
    .maybeSingle()
  if (activeSession) {
    return jsonError('A Shortcut session is already running for this campaign.', 409)
  }

  if (!campaign.is_test_mode) {
    const dailyCap = await checkDailySendCap(supabase, profile, remainingCount)
    if (!dailyCap.allowed) return jsonError(dailyCap.reason!, 429)
  }

  const session = await issueShortcutSession(supabase, user.id, campaign.id)

  const { data: updated, error } = await supabase
    .from('campaigns')
    .update({ status: 'queued' })
    .eq('id', campaign.id)
    .select()
    .single()
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'campaign.resumed', entityType: 'campaign', entityId: campaign.id })

  return NextResponse.json({ campaign: updated, shortcut_launch_url: session.launchUrl, expires_at: session.expiresAt })
}
