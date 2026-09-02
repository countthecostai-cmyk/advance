import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { contactInputSchema } from '@/lib/validation'
import { validateAndNormalizePhone } from '@/lib/phone'
import { logAudit } from '@/lib/audit'

// GET /api/contacts?search=&group_id=&opted_out=false
export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()
  const groupId = searchParams.get('group_id')
  const includeOptedOut = searchParams.get('opted_out') !== 'false'

  let query = supabase
    .from('contacts')
    .select('*, contact_group_members(group_id, contact_groups(id, name, color))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('first_name', `%${search}%`) // narrowed further below in-memory for the multi-field trigram match
  }
  if (!includeOptedOut) {
    query = query.eq('opted_out', false)
  }

  const { data, error } = await query
  if (error) return jsonError(error.message, 500)

  let contacts = (data || []).map((c: any) => ({
    ...c,
    groups: (c.contact_group_members || []).map((m: any) => m.contact_groups).filter(Boolean),
    contact_group_members: undefined,
  }))

  // Full multi-field search (name OR phone) using the trigram index via RPC
  // would be ideal; for simplicity and to keep this a single round trip we
  // widen the match here when a search term is present and the simple
  // ilike above found nothing (covers "search by phone" and "search by last
  // name" which the query above doesn't cover on its own).
  if (search) {
    const term = search.toLowerCase()
    const { data: all } = await supabase
      .from('contacts')
      .select('*, contact_group_members(group_id, contact_groups(id, name, color))')
      .eq('user_id', user.id)
    const fullSet = (all || []).map((c: any) => ({
      ...c,
      groups: (c.contact_group_members || []).map((m: any) => m.contact_groups).filter(Boolean),
      contact_group_members: undefined,
    }))
    contacts = fullSet.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) ||
        c.phone_number.includes(search) ||
        c.phone_number.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
    )
    if (groupId) contacts = contacts.filter((c) => c.groups.some((g: any) => g.id === groupId))
    if (!includeOptedOut) contacts = contacts.filter((c) => !c.opted_out)
  } else if (groupId) {
    contacts = contacts.filter((c) => c.groups.some((g: any) => g.id === groupId))
  }

  return NextResponse.json({ contacts })
}

// POST /api/contacts — create one contact
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = contactInputSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const phone = validateAndNormalizePhone(parsed.data.phone_number)
  if (!phone.valid || !phone.e164) return jsonError(phone.reason || 'Invalid phone number')

  // Check suppression list — a suppressed number is never re-addable as
  // "opted in" through a normal contact create; the account owner has to
  // explicitly clear the suppression entry (Settings -> Compliance) first.
  const { data: suppressed } = await supabase
    .from('suppression_list')
    .select('id')
    .eq('user_id', user.id)
    .eq('phone_number', phone.e164)
    .maybeSingle()

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      user_id: user.id,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone_number: phone.e164,
      notes: parsed.data.notes,
      consent_status: parsed.data.consent_status,
      consent_source: parsed.data.consent_source ?? null,
      consent_recorded_at: parsed.data.consent_status !== 'unknown' ? new Date().toISOString() : null,
      opted_out: !!suppressed,
      opted_out_at: suppressed ? new Date().toISOString() : null,
      opted_out_reason: suppressed ? 'Phone number is on your suppression list' : null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return jsonError('A contact with this phone number already exists', 409)
    return jsonError(error.message, 500)
  }

  if (parsed.data.group_ids.length > 0) {
    const rows = parsed.data.group_ids.map((group_id) => ({ contact_id: contact.id, group_id, user_id: user.id }))
    await supabase.from('contact_group_members').insert(rows)
  }

  if (parsed.data.consent_status !== 'unknown') {
    await supabase.from('consents').insert({
      user_id: user.id,
      contact_id: contact.id,
      status: parsed.data.consent_status,
      method: parsed.data.consent_source || 'manual',
    })
  }

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'contact.created',
    entityType: 'contact',
    entityId: contact.id,
    metadata: { phone_number: phone.e164 },
  })

  return NextResponse.json({ contact }, { status: 201 })
}
