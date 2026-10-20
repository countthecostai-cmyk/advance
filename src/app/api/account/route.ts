import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { createServiceRoleSupabase } from '@/lib/supabase/server'

// DELETE /api/account — permanently deletes the signed-in person's account.
// Apple requires apps that create accounts to let people delete them from
// inside the app (App Store Review Guideline 5.1.1(v)).
//
// Every table that holds a person's data references auth.users with
// `on delete cascade` (see supabase/migrations), so deleting the auth user
// removes their profile, contacts, groups, events, advances, and message
// history in one step. audit_logs uses `on delete set null`, so those rows
// lose their link to the person rather than blocking the delete.
export async function DELETE() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const admin = createServiceRoleSupabase()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message || 'Could not delete account' }, { status: 500 })
  }

  // Clear the session cookie on this device too.
  await supabase.auth.signOut().catch(() => undefined)

  return NextResponse.json({ ok: true })
}
