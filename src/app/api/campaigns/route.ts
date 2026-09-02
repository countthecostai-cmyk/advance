import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { campaignCreateSchema } from '@/lib/validation'
import { resolveCampaignRecipients } from '@/lib/campaignRecipients'
import { checkCampaignRecipientCap } from '@/lib/rateLimit'
import { logAudit } from '@/lib/audit'
import { DEFAULT_CHUNK_SIZE, DEFAULT_RATE_LIMIT_SECONDS } from '@/lib/constants'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ campaigns })
}

// POST /api/campaigns — create a campaign with its recipient list fully
// resolved and personalized up front. The campaign starts in 'ready' status;
// nothing is sent until the user explicitly starts it from the review screen.
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user, profile } = auth

  const body = await request.json().catch(() => null)
  const parsed = campaignCreateSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  if (!parsed.data.is_test_mode && parsed.data.contact_ids.length === 0 && parsed.data.group_ids.length === 0) {
    return jsonError('Select at least one contact or group')
  }

  let resolved
  try {
    resolved = await resolveCampaignRecipients(supabase, user.id, profile, {
      contactIds: parsed.data.contact_ids,
      groupIds: parsed.data.group_ids,
      messageTemplate: parsed.data.message_template,
      includeOptOutFooter: parsed.data.include_opt_out_footer,
      isTestMode: parsed.data.is_test_mode,
    })
  } catch (e: any) {
    return jsonError(e.message || 'Could not resolve recipients')
  }

  if (resolved.recipients.length === 0) {
    return jsonError('No sendable recipients — everyone selected is opted out, suppressed, or invalid.')
  }

  if (!parsed.data.is_test_mode) {
    const capCheck = await checkCampaignRecipientCap(supabase, profile, resolved.recipients.length)
    if (!capCheck.allowed) return jsonError(capCheck.reason!, 422)
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      message_template: parsed.data.message_template,
      status: 'ready',
      is_test_mode: parsed.data.is_test_mode,
      scheduled_at: parsed.data.scheduled_at ?? null,
      recipient_count: resolved.recipients.length,
      rate_limit_seconds: parsed.data.rate_limit_seconds ?? DEFAULT_RATE_LIMIT_SECONDS,
      chunk_size: parsed.data.chunk_size ?? DEFAULT_CHUNK_SIZE,
      include_opt_out_footer: parsed.data.include_opt_out_footer,
    })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  const recipientRows = resolved.recipients.map((r, i) => ({
    campaign_id: campaign.id,
    user_id: user.id,
    contact_id: r.contact_id,
    phone_number: r.phone_number,
    first_name: r.first_name,
    last_name: r.last_name,
    personalized_message: r.personalized_message,
    sequence_index: i,
    status: 'pending' as const,
  }))

  const { error: recipientsError } = await supabase.from('campaign_recipients').insert(recipientRows)
  if (recipientsError) {
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    return jsonError(recipientsError.message, 500)
  }

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'campaign.created',
    entityType: 'campaign',
    entityId: campaign.id,
    metadata: {
      recipient_count: resolved.recipients.length,
      excluded_opted_out: resolved.excludedOptedOut,
      excluded_duplicates: resolved.excludedDuplicates,
      is_test_mode: parsed.data.is_test_mode,
    },
  })

  return NextResponse.json({
    campaign,
    excluded_opted_out: resolved.excludedOptedOut,
    excluded_duplicates: resolved.excludedDuplicates,
  }, { status: 201 })
}
