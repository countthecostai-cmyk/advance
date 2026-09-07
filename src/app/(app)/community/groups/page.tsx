import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { getTerminology } from '@/lib/terminology'

export default async function CommunityGroupsPage() {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name, vertical)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!membership) redirect('/community/onboarding')

  const org = membership.organizations as unknown as { name: string; vertical: string }
  const t = getTerminology(org.vertical)

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, description, meeting_schedule, group_members(count)')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">{t.groupNounPlural}</h1>
        {membership.role !== 'member' && (
          <Link href="/community/groups/new">
            <Button size="sm">New</Button>
          </Link>
        )}
      </div>

      {!groups?.length ? (
        <EmptyState
          icon="👪"
          title={`No ${t.groupNounPlural.toLowerCase()} yet`}
          description={`Create your first ${t.groupNoun.toLowerCase()} to get started.`}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <Link key={g.id} href={`/community/groups/${g.id}`} className="rounded-xl2 border border-ink-100 bg-white p-4">
              <p className="font-semibold text-ink-900">{g.name}</p>
              {g.description && <p className="mt-1 line-clamp-2 text-sm text-ink-400">{g.description}</p>}
              <div className="mt-2 flex items-center gap-3 text-xs text-ink-400">
                {g.meeting_schedule && <span>{g.meeting_schedule}</span>}
                <span>
                  {(g.group_members as unknown as { count: number }[])?.[0]?.count ?? 0} {t.memberNounPlural.toLowerCase()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
