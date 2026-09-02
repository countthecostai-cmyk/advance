import { NextRequest, NextResponse } from 'next/server'
import { requireShortcutSession } from '@/lib/shortcutAuth'
import { shortcutCompleteSchema } from '@/lib/validation'
import { logAudit } from '@/lib/audit'

// POST /api/shortcut/:token/complete — the Shortcut's last action, called
// once it's worked through its whole fetched chunk (or was told to stop
// mid-chunk via `continue: false`). Marks this session done and recomputes
// the campaign's rollup counts/status. If recipients remain, the campaign
// stays in 'sending' and the PWA's "Continue in Apple Messages" button
// issues a new session for the next chunk.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const auth = await requireShortcutSession(params.token)
  if ('error' in auth) return auth.error
  const { supabase, session, campaign } = auth

  const body = await request.json().catch(() => ({}))
  const parsed = shortcutCompleteSchema.safeParse(body)
  const reason = parsed.success ? parsed.data.reason : 'finished'

  await supabase.from('shortcut_sessions').update({ status: 'completed', last_used_at: new Date().toISOString() }).eq('id', session.id)
  await supabase.rpc('recompute_campaign_progress', { p_campaign_id: campaign.id })

  const { data: updatedCampaign } = await supabase
    .from('campaigns')
    .select('status, recipient_count, processed_count, error_count, skipped_count')
    .eq('id', campaign.id)
    .maybeSingle()

  await logAudit(supabase, {
    userId: campaign.user_id,
    actor: 'shortcut',
    action: 'shortcut.session_completed',
    entityType: 'campaign',
    entityId: campaign.id,
    metadata: { reason },
  })

  return NextResponse.json({ ok: true, campaign: updatedCampaign })
}
