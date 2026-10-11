import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { importContactsForUser } from '@/lib/contactsImport'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().trim().max(200).optional(),
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(32).optional(),
  phone_number: z.string().trim().max(32).optional(),
})

const bodySchema = z.object({
  contacts: z.array(contactSchema).min(1, 'No contacts were sent').max(2000, 'Too many contacts in one batch (max 2000)'),
  group: z.string().trim().max(100).optional(),
})

// POST /api/contacts/import-native — called from inside the native iPhone
// app shell (Capacitor) right after someone taps "Connect my Contacts" and
// grants the native iOS permission prompt. Unlike the Shortcut-based
// importer, this is authenticated by the person's own logged-in Advance
// session (there's a real browser/WKWebView session here, unlike a
// Shortcut run), so no separate import link or token is involved at all.
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const { imported, updated, errors } = await importContactsForUser(supabase, user.id, parsed.data.contacts, parsed.data.group)

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'contacts.imported_from_iphone',
    metadata: { imported, updated, failed: errors.length, group: parsed.data.group || null, source: 'native_app' },
  })

  return NextResponse.json({ imported, updated, failed: errors.length, errors: errors.slice(0, 50) })
}
