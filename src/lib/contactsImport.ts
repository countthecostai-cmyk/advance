import type { AppSupabaseClient } from '@/lib/supabase/server'
import { validateAndNormalizePhone } from '@/lib/phone'

export interface ImportableContact {
  name?: string
  first_name?: string
  last_name?: string
  phone?: string
  phone_number?: string
}

export interface ImportResult {
  imported: number
  updated: number
  errors: Array<{ input: string; error: string }>
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') }
}

// Shared by every "bring in a batch of contacts" entry point — the Shortcut
// webhook, and the native iPhone app's own Contacts picker. One phone
// number can appear more than once in someone's address book (home/work
// entries, duplicate saves); this upserts on (user_id, phone_number) so a
// second pass just updates the name instead of creating a duplicate.
export async function importContactsForUser(
  supabase: AppSupabaseClient,
  userId: string,
  contacts: ImportableContact[],
  groupName?: string
): Promise<ImportResult> {
  const { data: suppressionRows } = await supabase.from('suppression_list').select('phone_number').eq('user_id', userId)
  const suppressed = new Set((suppressionRows || []).map((s: { phone_number: string }) => s.phone_number))

  let groupId: string | undefined
  const trimmedGroup = groupName?.trim()
  if (trimmedGroup) {
    const { data: existingGroup } = await supabase
      .from('contact_groups')
      .select('id')
      .eq('user_id', userId)
      .eq('name', trimmedGroup)
      .maybeSingle()
    if (existingGroup) {
      groupId = existingGroup.id
    } else {
      const { data: createdGroup } = await supabase
        .from('contact_groups')
        .insert({ user_id: userId, name: trimmedGroup })
        .select('id')
        .single()
      groupId = createdGroup?.id
    }
  }

  let imported = 0
  let updated = 0
  const membershipRows: Array<{ contact_id: string; group_id: string; user_id: string }> = []
  const errors: Array<{ input: string; error: string }> = []

  for (const raw of contacts) {
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
          user_id: userId,
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

    if (groupId) membershipRows.push({ contact_id: contact.id, group_id: groupId, user_id: userId })
  }

  if (membershipRows.length > 0) {
    await supabase.from('contact_group_members').upsert(membershipRows, { onConflict: 'contact_id,group_id' })
  }

  return { imported, updated, errors }
}
