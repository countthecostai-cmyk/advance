import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { checkDailySendCap, checkMinTimeBetweenCampaigns } from '@/lib/rateLimit'
import { issueShortcutSession } from '@/lib/shortcutSession'
import { logAudit } from '@/lib/audit'

// POST /api/campaigns/[id]/start — first-time start of a 'ready' campaign.
// Issues a Shortcut session token and returns the shortcuts:// URL the PWA
// should navigate to. Nothing is sent by this call itself — Apple Messages
// only sees a message once the Shortcut actually runs on the user's phone.
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
  if (campaign.status !== 'ready') {
    return jsonError(`Campaign is "${campaign.status}" — only a "ready" campaign can be started.`, 409)
  }

  if (!campaign.is_test_mode) {
    const [dailyCap, minTime] = await Promise.all([
      checkDailySendCap(supabase, profile, campaign.recipient_count),
      checkMinTimeBetweenCampaigns(supabase, profile),
    ])
    if (!dailyCap.allowed) return jsonError(dailyCap.reason!, 429)
    if (!minTime.allowed) return jsonError(minTime.reason!, 429)
  }

  const session = await issueShortcutSession(supabase, user.id, campaign.id)

  const { data: updated, error } = await supabase
    .from('campaigns')
    .update({ status: 'queued', started_at: new Date().toISOString() })
    .eq('id', campaign.id)
    .select()
    .single()
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'campaign.started',
    entityType: 'campaign',
    entityId: campaign.id,
    metadata: { recipient_count: campaign.recipient_count, is_test_mode: campaign.is_test_mode },
  })

  return NextResponse.json({ campaign: updated, shortcut_launch_url: session.launchUrl, expires_at: session.expiresAt })
}
