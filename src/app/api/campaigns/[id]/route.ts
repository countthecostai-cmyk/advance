import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { campaignUpdateSchema } from '@/lib/validation'
import { personalizeMessage, OPT_OUT_FOOTER } from '@/lib/personalization'
import { createOptOutToken } from '@/lib/tokens'
import { logAudit } from '@/lib/audit'
import type { Campaign } from '@/lib/types/database.types'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .single()

  if (error || !campaign) return jsonError('Campaign not found', 404)

  const { data: recipients } = await supabase
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', params.id)
    .order('sequence_index')

  return NextResponse.json({ campaign, recipients: recipients || [] })
}

// Only editable while the campaign hasn't started sending. Editing the
// message re-renders every recipient's personalized_message from scratch.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()
  if (!campaign) return jsonError('Campaign not found', 404)
  if (!['ready', 'paused'].includes(campaign.status)) {
    return jsonError('This campaign can no longer be edited — its send is already in progress or finished.', 409)
  }

  const body = await request.json().catch(() => null)
  const parsed = campaignUpdateSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const update: Partial<Campaign> = { ...parsed.data }

  if (parsed.data.message_template) {
    const { data: recipients } = await supabase
      .from('campaign_recipients')
      .select('id, first_name, last_name, phone_number')
      .eq('campaign_id', params.id)
      .in('status', ['pending'])

    for (const r of recipients || []) {
      let text = personalizeMessage(parsed.data.message_template, { first_name: r.first_name, last_name: r.last_name })
      if (campaign.include_opt_out_footer) {
        const token = createOptOutToken({ uid: user.id, phone: r.phone_number })
        text += OPT_OUT_FOOTER(`${process.env.NEXT_PUBLIC_APP_URL}/opt-out/${token}`)
      }
      await supabase.from('campaign_recipients').update({ personalized_message: text }).eq('id', r.id)
    }
  }

  const { data: updated, error } = await supabase
    .from('campaigns')
    .update(update)
    .eq('user_id', user.id)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'campaign.updated', entityType: 'campaign', entityId: params.id })

  return NextResponse.json({ campaign: updated })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
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
  if (['queued', 'sending'].includes(campaign.status)) {
    return jsonError('Stop this campaign before deleting it.', 409)
  }

  const { error } = await supabase.from('campaigns').delete().eq('user_id', user.id).eq('id', params.id)
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'campaign.deleted', entityType: 'campaign', entityId: params.id })

  return NextResponse.json({ ok: true })
}
