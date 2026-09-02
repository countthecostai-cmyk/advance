import { NextRequest, NextResponse } from 'next/server'
import { requireShortcutSession } from '@/lib/shortcutAuth'
import { shortcutProgressSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

// POST /api/shortcut/:token/progress — called once per recipient, right
// after the Shortcut's "Send Message" action runs for them. This is what
// lets Pause/Stop take effect *inside* an already-running Shortcut: the
// response's `continue` field tells the Shortcut (via an "If" action
// wrapped around the next loop iteration) whether to keep going.
//
// `result: 'handed_to_messages'` means exactly that and nothing more — the
// Send Message action ran without the Shortcut reporting an error. It is
// NOT delivery confirmation; see docs/APPLE_SHORTCUTS.md.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const auth = await requireShortcutSession(params.token)
  if ('error' in auth) return auth.error
  const { supabase, campaign } = auth

  const body = await request.json().catch(() => null)
  const parsed = shortcutProgressSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })

  const { data: recipient } = await supabase
    .from('campaign_recipients')
    .select('*')
    .eq('id', parsed.data.recipient_id)
    .eq('campaign_id', campaign.id)
    .maybeSingle()

  if (!recipient) return NextResponse.json({ error: 'Recipient not found on this campaign' }, { status: 404 })

  const status = parsed.data.result === 'handed_to_messages' ? 'handed_to_messages' : 'error'

  await supabase
    .from('campaign_recipients')
    .update({ status, error_message: parsed.data.error_message ?? null, processed_at: new Date().toISOString() })
    .eq('id', recipient.id)

  await supabase.from('messages').insert({
    user_id: campaign.user_id,
    campaign_id: campaign.id,
    campaign_recipient_id: recipient.id,
    contact_id: recipient.contact_id,
    phone_number: recipient.phone_number,
    body: recipient.personalized_message,
    status: status === 'handed_to_messages' ? 'handed_to_messages' : 'failed',
    handed_to_messages_at: status === 'handed_to_messages' ? new Date().toISOString() : null,
  })

  await supabase.rpc('recompute_campaign_progress', { p_campaign_id: campaign.id })

  // Re-check whether we should keep going: re-fetch the session/campaign
  // fresh (a Pause tap on the phone may have landed between the previous GET
  // and this POST).
  const { data: freshSession } = await supabase
    .from('shortcut_sessions')
    .select('status')
    .eq('campaign_id', campaign.id)
    .eq('id', auth.session.id)
    .maybeSingle()
  const { data: freshCampaign } = await supabase.from('campaigns').select('status').eq('id', campaign.id).maybeSingle()

  const shouldContinue = freshSession?.status === 'active' && ['queued', 'sending'].includes(freshCampaign?.status || '')

  await logAudit(supabase, {
    userId: campaign.user_id,
    actor: 'shortcut',
    action: status === 'handed_to_messages' ? 'shortcut.message_handed_off' : 'shortcut.message_failed',
    entityType: 'campaign_recipient',
    entityId: recipient.id,
  })

  return NextResponse.json({ continue: shouldContinue, status })
}
