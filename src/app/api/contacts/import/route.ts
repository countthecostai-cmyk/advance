import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { parseContactsCsv } from '@/lib/csv'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const importSchema = z.object({
  csv: z.string().min(1).max(5_000_000),
  default_group_id: z.string().uuid().optional(),
})

// POST /api/contacts/import — CSV import with per-row validation.
// Accepted columns (case-insensitive, several aliases supported — see
// src/lib/csv.ts): first_name, last_name, phone_number, notes, group,
// consent_status.
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const { rows, truncated, totalRows } = parseContactsCsv(parsed.data.csv)
  const validRows = rows.filter((r) => r.valid)
  const invalidRows = rows.filter((r) => !r.valid)

  // Pre-fetch existing suppression numbers once instead of a query per row.
  const { data: suppressionRows } = await supabase
    .from('suppression_list')
    .select('phone_number')
    .eq('user_id', user.id)
  const suppressed = new Set((suppressionRows || []).map((s) => s.phone_number))

  // Resolve / create groups named in the CSV, plus the optional default group.
  const groupNames = Array.from(new Set(validRows.map((r) => r.group).filter(Boolean)))
  const groupIdByName = new Map<string, string>()

  if (groupNames.length > 0) {
    const { data: existingGroups } = await supabase
      .from('contact_groups')
      .select('id, name')
      .eq('user_id', user.id)
      .in('name', groupNames)
    for (const g of existingGroups || []) groupIdByName.set(g.name, g.id)

    const missing = groupNames.filter((n) => !groupIdByName.has(n))
    if (missing.length > 0) {
      const { data: created } = await supabase
        .from('contact_groups')
        .insert(missing.map((name) => ({ user_id: user.id, name })))
        .select('id, name')
      for (const g of created || []) groupIdByName.set(g.name, g.id)
    }
  }

  let imported = 0
  let updated = 0
  const rowErrors: Array<{ row: number; error: string }> = []
  const membershipRows: Array<{ contact_id: string; group_id: string; user_id: string }> = []

  // Upsert one at a time so a duplicate phone number updates the existing
  // contact instead of failing the whole batch — CSV re-imports (e.g. an
  // updated export) are a very common flow.
  for (const row of validRows) {
    const isSuppressed = suppressed.has(row.phone_number)
    const { data: contact, error } = await supabase
      .from('contacts')
      .upsert(
        {
          user_id: user.id,
          first_name: row.first_name,
          last_name: row.last_name,
          phone_number: row.phone_number,
          notes: row.notes,
          consent_status: row.consent_status,
          consent_recorded_at: row.consent_status !== 'unknown' ? new Date().toISOString() : null,
          opted_out: isSuppressed,
          opted_out_at: isSuppressed ? new Date().toISOString() : null,
          opted_out_reason: isSuppressed ? 'Phone number is on your suppression list' : null,
        },
        { onConflict: 'user_id,phone_number' }
      )
      .select('id, created_at, updated_at')
      .single()

    if (error || !contact) {
      rowErrors.push({ row: row.row, error: error?.message || 'Could not save this row' })
      continue
    }

    if (contact.created_at === contact.updated_at) imported++
    else updated++

    const groupId = row.group ? groupIdByName.get(row.group) : parsed.data.default_group_id
    if (groupId) membershipRows.push({ contact_id: contact.id, group_id: groupId, user_id: user.id })
  }

  if (membershipRows.length > 0) {
    await supabase.from('contact_group_members').upsert(membershipRows, { onConflict: 'contact_id,group_id' })
  }

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'contacts.imported',
    metadata: { imported, updated, failed: rowErrors.length + invalidRows.length, total_rows: totalRows },
  })

  return NextResponse.json({
    imported,
    updated,
    failed: rowErrors.length + invalidRows.length,
    total_rows: totalRows,
    truncated,
    errors: [...invalidRows.map((r) => ({ row: r.row, error: r.error! })), ...rowErrors].slice(0, 200),
  })
}
