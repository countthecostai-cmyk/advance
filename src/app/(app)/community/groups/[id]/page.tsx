import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getTerminology } from '@/lib/terminology'
import { JoinButton } from './JoinButton'

export default async function CommunityGroupDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase.from('groups').select('*, organizations(vertical)').eq('id', params.id).maybeSingle()
  if (!group) notFound()

  const t = getTerminology((group.organizations as unknown as { vertical: string })?.vertical)

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, role, profiles(id, display_name)')
    .eq('group_id', params.id)

  const isMember = members?.some((m) => m.user_id === user.id)
  const isLeader = members?.some((m) => m.user_id === user.id && m.role === 'leader')

  const nowIso = new Date().toISOString()
  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, starts_at, location, rsvps(status)')
      .eq('group_id', params.id)
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true }),
    supabase
      .from('events')
      .select('id, title, starts_at')
      .eq('group_id', params.id)
      .lt('starts_at', nowIso)
      .order('starts_at', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{group.name}</h1>
          {group.description && <p className="mt-1 text-sm text-ink-400">{group.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
            {group.meeting_schedule && <span>{group.meeting_schedule}</span>}
            {group.location && <span>{group.location}</span>}
            <span>
              {members?.length ?? 0} {t.memberNounPlural.toLowerCase()}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {!isMember && <JoinButton groupId={params.id} label={`Join ${t.groupNoun.toLowerCase()}`} />}
          {isLeader && (
            <Link href={`/community/groups/${params.id}/events/new`}>
              <Button size="sm">New {t.eventNoun.toLowerCase()}</Button>
            </Link>
          )}
        </div>
      </div>

      <p className="mb-2 text-sm font-semibold text-ink-900">Upcoming {t.eventNounPlural.toLowerCase()}</p>
      {!upcoming?.length ? (
        <p className="mb-4 rounded-xl2 border border-dashed border-ink-200 bg-white p-4 text-sm text-ink-400">
          No upcoming {t.eventNounPlural.toLowerCase()}.
        </p>
      ) : (
        <div className="mb-4 flex flex-col gap-2">
          {upcoming.map((e) => {
            const statuses = (e.rsvps as unknown as { status: string }[]) ?? []
            const going = statuses.filter((r) => r.status === 'going').length
            const noResponse = statuses.filter((r) => r.status === 'no_response').length
            return (
              <Link
                key={e.id}
                href={`/community/events/${e.id}`}
                className="flex items-center justify-between rounded-xl2 border border-ink-100 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{e.title}</p>
                  <p className="text-xs text-ink-400">
                    {new Date(e.starts_at).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {e.location ? ` · ${e.location}` : ''}
                  </p>
                </div>
                <div className="text-right text-xs text-ink-400">
                  <p>
                    {going}/{statuses.length} going
                  </p>
                  {noResponse > 0 && isLeader && <p className="font-semibold text-amber-600">{noResponse} haven&apos;t responded</p>}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <p className="mb-2 text-sm font-semibold text-ink-900">{t.memberNounPlural}</p>
      <Card className="mb-4 divide-y divide-ink-100 p-0">
        {(members ?? []).map((m) => {
          const profile = m.profiles as unknown as { display_name: string | null }
          return (
            <div key={m.user_id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink-900">{profile?.display_name ?? 'Someone'}</span>
              <span className="text-xs text-ink-400">{m.role === 'leader' ? t.leaderNoun : t.memberNoun}</span>
            </div>
          )
        })}
      </Card>

      {past && past.length > 0 && (
        <>
          <p className="mb-2 text-sm font-semibold text-ink-900">Past {t.eventNounPlural.toLowerCase()}</p>
          <div className="flex flex-col gap-2 pb-4">
            {past.map((e) => (
              <Link key={e.id} href={`/community/events/${e.id}`} className="rounded-xl2 border border-ink-100 bg-white p-3 text-sm text-ink-700">
                {e.title} · {new Date(e.starts_at).toLocaleDateString()}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
