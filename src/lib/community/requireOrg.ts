import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import type { Organization, OrgRole } from '@/lib/types/database.types'

/**
 * Same shape/spirit as requireUser() in apiAuth.ts, extended for the
 * Groups/Community module: re-verifies the session, then loads the caller's
 * first organization membership (MVP: a person belongs to one org's context
 * at a time in the UI, though the data model allows more).
 */
export async function requireOrgContext() {
  const auth = await requireUser()
  if ('error' in auth) return { error: auth.error } as const

  const { supabase, user } = auth

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug, vertical, created_at)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return { error: NextResponse.json({ error: 'No organization', code: 'NO_ORG' }, { status: 404 }) } as const
  }

  return {
    supabase,
    user,
    orgId: membership.organization_id as string,
    role: membership.role as OrgRole,
    org: membership.organizations as unknown as Organization,
  } as const
}
