import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getTerminology } from '@/lib/terminology'
import { NewGroupForm } from './NewGroupForm'

export default async function NewCommunityGroupPage() {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organizations(vertical)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!membership) redirect('/community/onboarding')

  const vertical = (membership.organizations as unknown as { vertical: string })?.vertical
  const t = getTerminology(vertical)

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold text-ink-900">Create a {t.groupNoun.toLowerCase()}</h1>
      <NewGroupForm terminology={t} />
    </div>
  )
}
