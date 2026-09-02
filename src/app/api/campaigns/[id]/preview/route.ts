import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'

// GET /api/campaigns/[id]/preview — a handful of real, fully personalized
// message bodies so the user can see exactly what will be sent before
// confirming, per the spec's "generate a preview of several actual
// personalized messages."
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, recipient_count')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()
  if (!campaign) return jsonError('Campaign not found', 404)

  const { data: samples } = await supabase
    .from('campaign_recipients')
    .select('first_name, last_name, phone_number, personalized_message')
    .eq('campaign_id', params.id)
    .order('sequence_index')
    .limit(5)

  return NextResponse.json({ recipient_count: campaign.recipient_count, samples: samples || [] })
}
