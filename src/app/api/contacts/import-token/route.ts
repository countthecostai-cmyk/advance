import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { createContactsImportToken } from '@/lib/tokens'
import { logAudit } from '@/lib/audit'

// POST /api/contacts/import-token — (re)issues the personal link used by the
// "Add to Advance" contacts-import Shortcut. Returns the raw token exactly
// once; only its hash is ever stored (see src/lib/contactsImportAuth.ts).
// Calling this again immediately invalidates any previously issued link,
// which is also how someone revokes a lost/compromised link.
export async function POST() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { token, tokenHash } = createContactsImportToken()

  const { error } = await supabase
    .from('profiles')
    .update({ contacts_import_token_hash: tokenHash })
    .eq('id', user.id)
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'contacts_import_token.issued' })

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  return NextResponse.json({ token, import_url: `${appUrl}/api/contacts/import-shortcut/${token}` })
}

// DELETE /api/contacts/import-token — revokes the link without issuing a new
// one (e.g. the phone it was on was lost).
export async function DELETE() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { error } = await supabase
    .from('profiles')
    .update({ contacts_import_token_hash: null, contacts_import_configured_at: null })
    .eq('id', user.id)
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'contacts_import_token.revoked' })

  return NextResponse.json({ ok: true })
}
