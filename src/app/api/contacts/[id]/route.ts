import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { contactUpdateSchema } from '@/lib/validation'
import { validateAndNormalizePhone } from '@/lib/phone'
import { logAudit } from '@/lib/audit'
import type { Contact } from '@/lib/types/database.types'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*, contact_group_members(group_id, contact_groups(id, name, color))')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .single()

  if (error || !contact) return jsonError('Contact not found', 404)

  const { data: consentHistory } = await supabase
    .from('consents')
    .select('*')
    .eq('contact_id', params.id)
    .order('recorded_at', { ascending: false })

  return NextResponse.json({
    contact: {
      ...contact,
      groups: (contact.contact_group_members || []).map((m: any) => m.contact_groups).filter(Boolean),
      contact_group_members: undefined,
    },
    consent_history: consentHistory || [],
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = contactUpdateSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const { data: existing } = await supabase
    .from('contacts')
    .select('id, opted_out, phone_number')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()
  if (!existing) return jsonError('Contact not found', 404)

  const update: Partial<Contact> = {}
  if (parsed.data.first_name !== undefined) update.first_name = parsed.data.first_name
  if (parsed.data.last_name !== undefined) update.last_name = parsed.data.last_name
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes

  if (parsed.data.phone_number !== undefined) {
    const phone = validateAndNormalizePhone(parsed.data.phone_number)
    if (!phone.valid || !phone.e164) return jsonError(phone.reason || 'Invalid phone number')
    update.phone_number = phone.e164
  }

  if (parsed.data.consent_status !== undefined) {
    update.consent_status = parsed.data.consent_status
    update.consent_recorded_at = new Date().toISOString()
    if (parsed.data.consent_source !== undefined) update.consent_source = parsed.data.consent_source
    // "unknown" is the absence of a recorded consent decision, not an event
    // worth logging — only given/implied/declined belong in the history.
    if (parsed.data.consent_status !== 'unknown') {
      await supabase.from('consents').insert({
        user_id: user.id,
        contact_id: params.id,
        status: parsed.data.consent_status,
        method: parsed.data.consent_source || 'manual',
      })
    }
  }

  // Manual opt-out toggle. Turning it ON also adds a suppression_list entry
  // so the number stays suppressed even if this contact is later deleted or
  // re-imported. Turning it OFF (re-subscribing) is deliberately NOT allowed
  // here — a suppressed number can only be cleared from Settings ->
  // Compliance, as an explicit, separately-logged action.
  if (parsed.data.opted_out === true && !existing.opted_out) {
    update.opted_out = true
    update.opted_out_at = new Date().toISOString()
    update.opted_out_reason = parsed.data.opted_out_reason || 'Manually marked opted out'
    await supabase
      .from('suppression_list')
      .upsert(
        { user_id: user.id, phone_number: existing.phone_number, reason: 'manual', note: parsed.data.opted_out_reason },
        { onConflict: 'user_id,phone_number' }
      )
    await logAudit(supabase, {
      userId: user.id,
      actor: 'user',
      action: 'contact.opted_out',
      entityType: 'contact',
      entityId: params.id,
    })
  }

  const { data: contact, error } = await supabase
    .from('contacts')
    .update(update)
    .eq('user_id', user.id)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return jsonError('A contact with this phone number already exists', 409)
    return jsonError(error.message, 500)
  }

  if (parsed.data.group_ids !== undefined) {
    await supabase.from('contact_group_members').delete().eq('contact_id', params.id).eq('user_id', user.id)
    if (parsed.data.group_ids.length > 0) {
      const rows = parsed.data.group_ids.map((group_id) => ({ contact_id: params.id, group_id, user_id: user.id }))
      await supabase.from('contact_group_members').insert(rows)
    }
  }

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'contact.updated',
    entityType: 'contact',
    entityId: params.id,
    metadata: { fields: Object.keys(update) },
  })

  return NextResponse.json({ contact })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { error } = await supabase.from('contacts').delete().eq('user_id', user.id).eq('id', params.id)
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'contact.deleted', entityType: 'contact', entityId: params.id })

  return NextResponse.json({ ok: true })
}
