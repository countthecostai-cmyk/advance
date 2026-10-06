import { NextRequest, NextResponse } from 'next/server'
import { requireContactsImportToken } from '@/lib/contactsImportAuth'
import { validateAndNormalizePhone } from '@/lib/phone'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

// Accepts either a single "name" field or separate first/last, and either
// "phone" or "phone_number" — the build guide uses `name` + `phone` (what
// Apple's "Get Details of Contacts" action returns most directly), but this
// stays forgiving of either shape since it's typed JSON built by hand in the
// Shortcuts app, not a schema anyone can validate ahead of time.
const contactSchema = z.object({
  name: z.string().trim().max(200).optional(),
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(32).optional(),
  phone_number: z.string().trim().max(32).optional(),
})

const bodySchema = z.object({
  contacts: z.array(contactSchema).min(1, 'No contacts were sent').max(500, 'Too many contacts in one batch (max 500)'),
  // Optional list/group name to drop these contacts straight into -- lets a
  // Share Sheet shortcut (or the manual "Add to Advance" one) send people
  // into a specific Advance list in the same request, with no extra screen.
  // Matches by name per-user; created automatically if it doesn't exist yet,
  // same behavior as the CSV importer's "group" column.
  group: z.string().trim().max(100).optional(),
})

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') }
}

// POST /api/contacts/import-shortcut/:token — called by the "Add to
// Advance" Shortcut right after the person picks one or more contacts from
// their iPhone's Contacts app. Authenticated purely by the personal token
// embedded in the Shortcut — there's no Supabase session on a Shortcut run,
// the same pattern the Sender Shortcut uses (see src/lib/shortcutAuth.ts).
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const auth = await requireContactsImportToken(params.token)
  if ('error' in auth) return auth.error
  const { supabase, profile } = auth

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const { data: suppressionRows } = await supabase
    .from('suppression_list')
    .select('phone_number')
    .eq('user_id', profile.id)
  const suppressed = new Set((suppressionRows || []).map((s) => s.phone_number))

  // Resolve (or create) the named list up front, same pattern as the CSV importer.
  let groupId: string | undefined
  const groupName = parsed.data.group?.trim()
  if (groupName) {
    const { data: existingGroup } = await supabase
      .from('contact_groups')
      .select('id')
      .eq('user_id', profile.id)
      .eq('name', groupName)
      .maybeSingle()
    if (existingGroup) {
      groupId = existingGroup.id
    } else {
      const { data: createdGroup } = await supabase
        .from('contact_groups')
        .insert({ user_id: profile.id, name: groupName })
        .select('id')
        .single()
      groupId = createdGroup?.id
    }
  }

  let imported = 0
  let updated = 0
  const membershipRows: Array<{ contact_id: string; group_id: string; user_id: string }> = []
  const errors: Array<{ input: string; error: string }> = []

  for (const raw of parsed.data.contacts) {
    const rawName = raw.name || [raw.first_name, raw.last_name].filter(Boolean).join(' ')
    const { first_name, last_name } =
      raw.first_name || raw.last_name
        ? { first_name: raw.first_name || '', last_name: raw.last_name || '' }
        : splitName(rawName)

    const label = rawName || raw.phone || raw.phone_number || '(unnamed contact)'

    if (!first_name) {
      errors.push({ input: label, error: 'Missing a name' })
      continue
    }

    const phoneRaw = raw.phone || raw.phone_number
    if (!phoneRaw) {
      errors.push({ input: label, error: 'This contact has no phone number' })
      continue
    }

    const phone = validateAndNormalizePhone(phoneRaw)
    if (!phone.valid || !phone.e164) {
      errors.push({ input: label, error: phone.reason || 'Invalid phone number' })
      continue
    }

    const isSuppressed = suppressed.has(phone.e164)
    const { data: contact, error } = await supabase
      .from('contacts')
      .upsert(
        {
          user_id: profile.id,
          first_name,
          last_name,
          phone_number: phone.e164,
          opted_out: isSuppressed,
          opted_out_at: isSuppressed ? new Date().toISOString() : null,
          opted_out_reason: isSuppressed ? 'Phone number is on your suppression list' : null,
        },
        { onConflict: 'user_id,phone_number' }
      )
      .select('id, created_at, updated_at')
      .single()

    if (error || !contact) {
      errors.push({ input: label, error: error?.message || 'Could not save this contact' })
      continue
    }

    if (contact.created_at === contact.updated_at) imported++
    else updated++

    if (groupId) membershipRows.push({ contact_id: contact.id, group_id: groupId, user_id: profile.id })
  }

  if (membershipRows.length > 0) {
    await supabase.from('contact_group_members').upsert(membershipRows, { onConflict: 'contact_id,group_id' })
  }

  await logAudit(supabase, {
    userId: profile.id,
    actor: 'shortcut',
    action: 'contacts.imported_from_iphone',
    metadata: { imported, updated, failed: errors.length, group: groupName || null },
  })

  return NextResponse.json({ imported, updated, failed: errors.length, errors: errors.slice(0, 50) })
}
