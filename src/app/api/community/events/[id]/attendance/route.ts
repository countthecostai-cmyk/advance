import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/apiAuth'
import { requireOrgContext } from '@/lib/community/requireOrg'
import { recordAttendanceSchema } from '@/lib/community/validation'
import { logAudit } from '@/lib/audit'

// Leader-only in practice (enforced by RLS: attendance_leader_manage requires
// is_group_leader or is_org_admin), so a member calling this simply gets a
// database-level permission error back as a 500.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOrgContext()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = recordAttendanceSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const { error } = await supabase.from('attendance').upsert(
    {
      event_id: params.id,
      user_id: parsed.data.user_id,
      status: parsed.data.status,
      recorded_by: user.id,
    },
    { onConflict: 'event_id,user_id' }
  )
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.attendance.recorded',
    entityType: 'event',
    entityId: params.id,
    metadata: { target_user_id: parsed.data.user_id, status: parsed.data.status },
  })

  return NextResponse.json({ ok: true })
}
