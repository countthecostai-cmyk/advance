import { NextRequest, NextResponse } from 'next/server'
import { requireContactsImportToken } from '@/lib/contactsImportAuth'
import { importContactsForUser } from '@/lib/contactsImport'
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

  const { imported, updated, errors } = await importContactsForUser(supabase, profile.id, parsed.data.contacts, parsed.data.group)

  await logAudit(supabase, {
    userId: profile.id,
    actor: 'shortcut',
    action: 'contacts.imported_from_iphone',
    metadata: { imported, updated, failed: errors.length, group: parsed.data.group || null },
  })

  return NextResponse.json({ imported, updated, failed: errors.length, errors: errors.slice(0, 50) })
}
