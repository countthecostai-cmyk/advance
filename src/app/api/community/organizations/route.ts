import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { createOrganizationSchema } from '@/lib/community/validation'
import { logAudit } from '@/lib/audit'

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'org'
  )
}

// Creates an organization and makes the caller its admin. Used by the
// Groups/Community onboarding flow — a person can create one even if they
// already have (or don't yet have) any organization membership.
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = createOrganizationSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  // Creating an organization and its first admin membership has to happen
  // with the service-role client: the caller isn't a member yet, so RLS
  // would reject both reading back the new organization row and inserting
  // an admin membership for it. The session above already proved who the
  // caller is, and the membership is always for that same user.
  const admin = createServiceRoleSupabase()

  const baseSlug = slugify(parsed.data.name)
  let slug = baseSlug
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await admin.from('organizations').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`
  }

  const { data: org, error } = await admin
    .from('organizations')
    .insert({ name: parsed.data.name, slug, vertical: parsed.data.vertical })
    .select()
    .single()
  if (error || !org) return jsonError(error?.message ?? 'Could not create organization', 500)

  const { error: memberError } = await admin
    .from('organization_members')
    .insert({ organization_id: org.id, user_id: user.id, role: 'admin' })
  if (memberError) {
    // Don't leave an orphaned organization nobody can see or manage.
    await admin.from('organizations').delete().eq('id', org.id)
    return jsonError(memberError.message, 500)
  }

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.organization.created',
    entityType: 'organization',
    entityId: org.id,
  })

  return NextResponse.json({ organization: org }, { status: 201 })
}
