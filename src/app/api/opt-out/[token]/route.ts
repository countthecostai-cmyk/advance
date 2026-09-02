import { NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { verifyOptOutToken } from '@/lib/tokens'
import { logAudit } from '@/lib/audit'

// POST /api/opt-out/:token — the public, unauthenticated self-serve opt-out
// endpoint linked from every outgoing message's footer. Deliberately a POST
// triggered by a button tap (not a bare page-load GET) so link-scanning /
// prefetching by mail & security clients can't silently opt someone out.
export async function POST(_request: Request, { params }: { params: { token: string } }) {
  const payload = verifyOptOutToken(params.token)
  if (!payload) {
    return NextResponse.json({ error: 'This link is invalid.' }, { status: 400 })
  }

  const supabase = createServiceRoleSupabase()

  await supabase
    .from('suppression_list')
    .upsert(
      { user_id: payload.uid, phone_number: payload.phone, reason: 'opt_out_link' },
      { onConflict: 'user_id,phone_number' }
    )

  await supabase
    .from('contacts')
    .update({ opted_out: true, opted_out_at: new Date().toISOString(), opted_out_reason: 'Used the self-serve opt-out link' })
    .eq('user_id', payload.uid)
    .eq('phone_number', payload.phone)

  await logAudit(supabase, {
    userId: payload.uid,
    actor: 'system',
    action: 'contact.opted_out_via_link',
    metadata: { phone_number: payload.phone },
  })

  return NextResponse.json({ ok: true })
}
