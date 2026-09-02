import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'

// GET /api/campaigns/[id]/recipients — full per-recipient status list, for
// the campaign detail screen's "who got what" breakdown. Paginated because a
// campaign can legitimately have hundreds of rows.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()
  if (!campaign) return jsonError('Campaign not found', 404)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(200, Number(searchParams.get('limit') || 100))
  const offset = Number(searchParams.get('offset') || 0)

  const { data: recipients, error, count } = await supabase
    .from('campaign_recipients')
    .select('id, first_name, last_name, phone_number, status, error_message, processed_at, sequence_index', {
      count: 'exact',
    })
    .eq('campaign_id', params.id)
    .order('sequence_index')
    .range(offset, offset + limit - 1)

  if (error) return jsonError(error.message, 500)

  return NextResponse.json({ recipients, total: count })
}
