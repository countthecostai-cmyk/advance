import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { createServiceRoleSupabase } from '@/lib/supabase/server'

// DELETE /api/account — permanently deletes the signed-in person's account.
// Apple requires apps that create accounts to let people delete them from
// inside the app (App Store Review Guideline 5.1.1(v)).
//
// Most tables reference auth.users with `on delete cascade`, so deleting the
// auth user removes profile, contacts, groups-of-contacts, advances, and
// message history in one step. A few community columns (groups.created_by,
// events.created_by, attendance.recorded_by) point at profiles WITHOUT a
// cascade rule, which makes Postgres refuse the delete. So, before deleting
// the user, this route:
//   1. deletes any organization this person is the ONLY member of (its
//      groups, events, RSVPs and attendance cascade with it), and
//   2. clears those "created by / recorded by" links on anything shared that
//      remains, so other members keep their groups and events.
export async function DELETE() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const admin = createServiceRoleSupabase()
  const fail = (step: string, message?: string) =>
    NextResponse.json({ error: `Could not delete account (${step})${message ? `: ${message}` : ''}` }, { status: 500 })

  // 1. Organizations where this person is the only member.
  const { data: myOrgs, error: orgErr } = await admin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
  if (orgErr) return fail('orgs', orgErr.message)

  for (const { organization_id } of myOrgs ?? []) {
    const { count, error: countErr } = await admin
      .from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', organization_id)
    if (countErr) return fail('org members', countErr.message)
    if ((count ?? 0) <= 1) {
      const { error } = await admin.from('organizations').delete().eq('id', organization_id)
      if (error) return fail('org delete', error.message)
    }
  }

  // 2. Clear non-cascading references on shared rows that remain.
  const clears = [
    admin.from('groups').update({ created_by: null }).eq('created_by', user.id),
    admin.from('events').update({ created_by: null }).eq('created_by', user.id),
    admin.from('attendance').update({ recorded_by: null }).eq('recorded_by', user.id),
  ]
  for (const res of await Promise.all(clears)) {
    if (res.error) return fail('unlink', res.error.message)
  }

  // 3. Delete the auth user; everything else cascades.
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return fail('user', error.message)

  // Clear the session cookie on this device too.
  await supabase.auth.signOut().catch(() => undefined)

  return NextResponse.json({ ok: true })
}
