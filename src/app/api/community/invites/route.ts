import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { jsonError } from '@/lib/apiAuth'
import { requireOrgContext } from '@/lib/community/requireOrg'
import { createInviteToken } from '@/lib/tokens'

const bodySchema = z.object({ group_id: z.string().uuid().optional() })

// POST /api/community/invites — returns a shareable invite link. Group
// invites: the group's leader or an org admin. Org-wide invites: admins.
export async function POST(request: NextRequest) {
  const auth = await requireOrgContext()
  if ('error' in auth) return auth.error
  const { supabase, user, orgId, role } = auth

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return jsonError('Invalid input')
  const groupId = parsed.data.group_id

  if (groupId) {
    const { data: group } = await supabase.from('groups').select('id, organization_id').eq('id', groupId).maybeSingle()
    if (!group || group.organization_id !== orgId) return jsonError('Group not found', 404)
    if (role !== 'admin') {
      const { data: leader } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (leader?.role !== 'leader') return jsonError('Only the group leader can invite people', 403)
    }
  } else if (role !== 'admin') {
    return jsonError('Only an admin can invite people to the whole organization', 403)
  }

  const token = createInviteToken(groupId ? { o: orgId, g: groupId } : { o: orgId })
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  return NextResponse.json({ url: `${origin.replace(/\/$/, '')}/join/${token}` })
}
