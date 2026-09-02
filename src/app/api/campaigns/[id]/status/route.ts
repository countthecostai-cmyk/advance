import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'

// GET /api/campaigns/[id]/status — lightweight polling endpoint for the
// send-progress screen. Deliberately returns only counters, not the full
// recipient list, so a 500-recipient campaign can be polled every couple of
// seconds without shipping megabytes.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, status, recipient_count, processed_count, error_count, skipped_count, started_at, completed_at')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()

  if (error || !campaign) return jsonError('Campaign not found', 404)

  const remaining = Math.max(
    0,
    campaign.recipient_count - campaign.processed_count - campaign.error_count - campaign.skipped_count
  )

  let awaitingContinue = false
  if (['queued', 'sending'].includes(campaign.status) && remaining > 0) {
    const { data: activeSession } = await supabase
      .from('shortcut_sessions')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('status', 'active')
      .maybeSingle()
    awaitingContinue = !activeSession
  }

  return NextResponse.json({ ...campaign, remaining, awaiting_continue: awaitingContinue })
}
