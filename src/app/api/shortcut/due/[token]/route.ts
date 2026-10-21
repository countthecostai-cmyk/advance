import { NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { verifyScheduleToken } from '@/lib/scheduleToken'
import { issueShortcutSession } from '@/lib/shortcutSession'
import { checkDailySendCap } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'
import type { Profile } from '@/lib/types/database.types'

// GET /api/shortcut/due/:token — called by the iPhone's timed automation.
// If one of this person's scheduled advances is due, it is started and a normal
// one-run Shortcut session token comes back ({ due: true, token }), which the
// automation hands to the regular "Advance Sender" Shortcut. Nothing due:
// { due: false }. Always HTTP 200 so the automation never shows an error.
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const parsed = verifyScheduleToken(params.token)
  if (!parsed) return NextResponse.json({ due: false, reason: 'invalid link' })

  const admin = createServiceRoleSupabase()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', parsed.userId).maybeSingle()
  const p = profile as (Profile & { schedule_nonce?: string | null }) | null
  if (!p || !p.schedule_nonce || p.schedule_nonce !== parsed.nonce) {
    return NextResponse.json({ due: false, reason: 'link was reset' })
  }

  await admin.from('profiles').update({ schedule_last_checked_at: new Date().toISOString() } as never).eq('id', p.id)

  const { data: due } = await admin
    .from('campaigns')
    .select('*')
    .eq('user_id', p.id)
    .eq('status', 'ready')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
  const campaign = due?.[0]
  if (!campaign) return NextResponse.json({ due: false })

  if (!campaign.is_test_mode) {
    const cap = await checkDailySendCap(admin, p, campaign.recipient_count)
    if (!cap.allowed) return NextResponse.json({ due: false, reason: cap.reason })
  }

  // Claim it first (ready -> queued) so two overlapping checks can't both start it.
  const { data: claimed } = await admin
    .from('campaigns')
    .update({ status: 'queued', started_at: new Date().toISOString() })
    .eq('id', campaign.id)
    .eq('status', 'ready')
    .select('id')
  if (!claimed || claimed.length === 0) return NextResponse.json({ due: false })

  const session = await issueShortcutSession(admin, p.id, campaign.id)
  await logAudit(admin, {
    userId: p.id,
    actor: 'shortcut',
    action: 'campaign.started_scheduled',
    entityType: 'campaign',
    entityId: campaign.id,
    metadata: { recipient_count: campaign.recipient_count, scheduled_at: campaign.scheduled_at },
  })

  return NextResponse.json({ due: true, token: session.token, campaign_name: campaign.name, recipients: campaign.recipient_count })
}
