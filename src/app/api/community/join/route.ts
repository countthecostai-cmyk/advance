import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/tokens'
import { logAudit } from '@/lib/audit'

const bodySchema = z.object({ token: z.string().min(10).max(500) })

// POST /api/community/join — accepts an invite link. Adds the signed-in
// person to the organization (and group) as a regular member. Uses the
// service-role client because the person isn't a member yet, so RLS would
// block them; the signed invite token is what authorizes this.
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError('Invalid invite link')
  const invite = verifyInviteToken(parsed.data.token)
  if (!invite) return jsonError('This invite link is not valid', 400)

  const admin = createServiceRoleSupabase()

  const { data: org } = await admin.from('organizations').select('id').eq('id', invite.o).maybeSingle()
  if (!org) return jsonError('This invite is for a group that no longer exists', 404)

  // Org membership — keep an existing role (never downgrade an admin/leader).
  const { error: orgErr } = await admin
    .from('organization_members')
    .upsert({ organization_id: invite.o, user_id: user.id, role: 'member' }, { onConflict: 'organization_id,user_id', ignoreDuplicates: true })
  if (orgErr) return jsonError(orgErr.message, 500)

  if (invite.g) {
    const { data: group } = await admin.from('groups').select('id, organization_id').eq('id', invite.g).maybeSingle()
    if (!group || group.organization_id !== invite.o) return jsonError('This invite is for a group that no longer exists', 404)

    const { error: gErr } = await admin
      .from('group_members')
      .upsert({ group_id: invite.g, user_id: user.id, role: 'member' }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
    if (gErr) return jsonError(gErr.message, 500)

    // Put them on the RSVP list for events already scheduled, so leaders see
    // them as "hasn't responded" instead of missing.
    const { data: upcoming } = await admin
      .from('events')
      .select('id')
      .eq('group_id', invite.g)
      .gte('starts_at', new Date().toISOString())
    if (upcoming?.length) {
      await admin
        .from('rsvps')
        .upsert(
          upcoming.map((e) => ({ event_id: e.id, user_id: user.id, status: 'no_response' as const })),
          { onConflict: 'event_id,user_id', ignoreDuplicates: true }
        )
    }
  }

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.invite.accepted',
    entityType: invite.g ? 'group' : 'organization',
    entityId: invite.g ?? invite.o,
  })

  return NextResponse.json({ ok: true, group_id: invite.g ?? null })
}
