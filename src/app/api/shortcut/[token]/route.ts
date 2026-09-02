import { NextResponse } from 'next/server'
import { requireShortcutSession } from '@/lib/shortcutAuth'
import { logAudit } from '@/lib/audit'

// GET /api/shortcut/:token — the Shortcut's very first action ("Get
// Contents of URL"). Returns one chunk of recipients (campaign.chunk_size at
// a time — see docs/APPLE_SHORTCUTS.md for why chunking instead of one
// giant fetch) as plain JSON the Shortcut loops over with "Repeat with Each."
//
// Every recipient returned here is atomically flipped from 'pending' to
// 'claimed' so a second concurrent fetch (e.g. the user double-tapping
// Send) can't hand out the same recipient twice.
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const auth = await requireShortcutSession(params.token)
  if ('error' in auth) return auth.error
  const { supabase, session, campaign } = auth

  if (!['queued', 'sending'].includes(campaign.status)) {
    return NextResponse.json({ continue: false, reason: `Campaign is ${campaign.status}.`, recipients: [] })
  }

  const { data: pending, error } = await supabase
    .from('campaign_recipients')
    .select('id, phone_number, first_name, last_name, personalized_message, sequence_index')
    .eq('campaign_id', campaign.id)
    .eq('status', 'pending')
    .order('sequence_index')
    .limit(campaign.chunk_size)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!pending || pending.length === 0) {
    return NextResponse.json({
      continue: false,
      done: true,
      recipients: [],
      message: 'No recipients left to send.',
    })
  }

  const ids = pending.map((p) => p.id)
  await supabase.from('campaign_recipients').update({ status: 'claimed', claimed_at: new Date().toISOString() }).in('id', ids)

  if (campaign.status === 'queued') {
    await supabase.from('campaigns').update({ status: 'sending' }).eq('id', campaign.id)
  }

  await supabase.from('shortcut_sessions').update({ last_used_at: new Date().toISOString() }).eq('id', session.id)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')

  await logAudit(supabase, {
    userId: campaign.user_id,
    actor: 'shortcut',
    action: 'shortcut.fetched_chunk',
    entityType: 'campaign',
    entityId: campaign.id,
    metadata: { count: pending.length },
  })

  return NextResponse.json({
    continue: true,
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    rate_limit_seconds: campaign.rate_limit_seconds,
    progress_url: `${appUrl}/api/shortcut/${params.token}/progress`,
    complete_url: `${appUrl}/api/shortcut/${params.token}/complete`,
    recipients: pending.map((p) => ({
      recipient_id: p.id,
      phone_number: p.phone_number,
      message: p.personalized_message,
      first_name: p.first_name,
    })),
  })
}
