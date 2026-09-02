import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { validateAndNormalizePhone } from '@/lib/phone'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const addSchema = z.object({
  phone_number: z.string().trim().min(3).max(32),
  note: z.string().trim().max(200).optional(),
})

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('suppression_list')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ suppression: data })
}

// POST /api/suppression — manually add a number to the suppression list
// (e.g. someone asked to stop over the phone rather than by replying STOP or
// tapping the opt-out link — see docs/COMPLIANCE.md for why those two are
// the only automatic paths this system has).
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const phone = validateAndNormalizePhone(parsed.data.phone_number)
  if (!phone.valid || !phone.e164) return jsonError(phone.reason || 'Invalid phone number')

  const { data, error } = await supabase
    .from('suppression_list')
    .upsert({ user_id: user.id, phone_number: phone.e164, reason: 'manual', note: parsed.data.note }, { onConflict: 'user_id,phone_number' })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  await supabase
    .from('contacts')
    .update({ opted_out: true, opted_out_at: new Date().toISOString(), opted_out_reason: parsed.data.note || 'Added to suppression list' })
    .eq('user_id', user.id)
    .eq('phone_number', phone.e164)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'suppression.added', metadata: { phone_number: phone.e164 } })

  return NextResponse.json({ entry: data }, { status: 201 })
}
