import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'

// GET /api/messages — the durable send-history log behind the Messages tab.
// Independent of campaigns.status so a deleted campaign doesn't erase its
// send history.
export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaign_id')
  const limit = Math.min(200, Number(searchParams.get('limit') || 50))
  const offset = Number(searchParams.get('offset') || 0)

  let query = supabase
    .from('messages')
    .select('*, campaigns(name)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (campaignId) query = query.eq('campaign_id', campaignId)

  const { data, error, count } = await query
  if (error) return jsonError(error.message, 500)

  const messages = (data || []).map((m: any) => ({ ...m, campaign_name: m.campaigns?.name ?? null, campaigns: undefined }))

  return NextResponse.json({ messages, total: count })
}
