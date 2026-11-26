import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { checkDailySendCap } from '@/lib/rateLimit'
import { issueShortcutSession, revokeActiveShortcutSessions } from '@/lib/shortcutSession'
import { logAudit } from '@/lib/audit'

// A live Shortcut run reports progress after every message.
const STALE_SESSION_MS = 2 * 60 * 1000

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
  if (!campaign) return jsonError('Advance not found', 404)
  if (!['paused', 'queued', 'sending'].includes(campaign.status)) {
    return jsonError(`Advance is "${campaign.status}" — nothing left to continue.`, 409)
  }

  const remainingCount = campaign.recipient_count - campaign.processed_count - campaign.error_count - campaign.skipped_count
  if (remainingCount <= 0) {
    return jsonError('Every recipient has already reached a final status.', 409)
  }

  // A run that is genuinely still going checks in on every message, so only
  // block when the active session was used in the last couple of minutes. A
  // session left "active" because the Shortcut was cancelled or crashed (it
  // never called /complete) used to lock this advance for the full 6-hour
  // token lifetime.
  const { data: activeSessions } = await supabase
    .from('shortcut_sessions')
    .select('id, last_used_at, created_at')
    .eq('campaign_id', campaign.id)
    .eq('status', 'active')
  const recentlyUsed = (activeSessions ?? []).some((s) => {
    const last = new Date(s.last_used_at || s.created_at).getTime()
    return Date.now() - last < STALE_SESSION_MS
  })
  if (recentlyUsed) {
    return jsonError('A Shortcut run is still sending for this advance. Wait a moment and try again.', 409)
  }

  // Recipients handed to a run that died before reporting back would
  // otherwise sit in 'claimed' forever: never re-sent, and the advance never
  // reaches 'completed'. The old session is revoked first (issueShortcutSession
  // below), so put them back in the queue for this run.
  await revokeActiveShortcutSessions(supabase, campaign.id)
  await supabase
    .from('campaign_recipients')
    .update({ status: 'pending', claimed_at: null })
    .eq('campaign_id', campaign.id)
    .eq('status', 'claimed')

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
