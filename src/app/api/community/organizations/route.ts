import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
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

  const baseSlug = slugify(parsed.data.name)
  let slug = baseSlug
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({ name: parsed.data.name, slug, vertical: parsed.data.vertical })
    .select()
    .single()
  if (error || !org) return jsonError(error?.message ?? 'Could not create organization', 500)

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({ organization_id: org.id, user_id: user.id, role: 'admin' })
  if (memberError) return jsonError(memberError.message, 500)

  await logAudit(supabase, {
    userId: user.id,
    actor: 'user',
    action: 'community.organization.created',
    entityType: 'organization',
    entityId: org.id,
  })

  return NextResponse.json({ organization: org }, { status: 201 })
}
