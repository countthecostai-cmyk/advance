import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { RsvpButtons } from './RsvpButtons'
import { AttendanceRow } from './AttendanceRow'

export default async function CommunityEventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*, groups(id, name)').eq('id', params.id).maybeSingle()
  if (!event || !event.group_id) notFound()

  const group = event.groups as unknown as { id: string; name: string } | null

  const { data: groupMembers } = await supabase
    .from('group_members')
    .select('user_id, role, profiles(id, display_name)')
    .eq('group_id', event.group_id)

  const isLeader = groupMembers?.some((m) => m.user_id === user.id && m.role === 'leader')

  const { data: rsvps } = await supabase.from('rsvps').select('user_id, status, profiles(display_name)').eq('event_id', params.id)
  const myRsvp = rsvps?.find((r) => r.user_id === user.id)

  const { data: attendance } = isLeader
    ? await supabase.from('attendance').select('user_id, status').eq('event_id', params.id)
    : { data: [] }
  const attendanceByUser = new Map((attendance ?? []).map((a) => [a.user_id, a.status]))

  const going = (rsvps ?? []).filter((r) => r.status === 'going')
  const maybe = (rsvps ?? []).filter((r) => r.status === 'maybe')
  const notGoing = (rsvps ?? []).filter((r) => r.status === 'not_going')
  const noResponse = (rsvps ?? []).filter((r) => r.status === 'no_response')

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="mb-4">
        {group && <p className="text-sm font-medium text-brand-600">{group.name}</p>}
        <h1 className="text-2xl font-bold text-ink-900">{event.title}</h1>
        <p className="mt-1 text-sm text-ink-400">
          {new Date(event.starts_at).toLocaleString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {event.location ? ` · ${event.location}` : ''}
        </p>
        {event.description && <p className="mt-3 text-sm text-ink-700">{event.description}</p>}
      </div>

      <Card className="mb-4">
        <p className="mb-2 text-sm font-medium text-ink-700">Your RSVP</p>
        <RsvpButtons eventId={params.id} currentStatus={myRsvp?.status} />
      </Card>

      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-ink-900">
          {going.length}/{rsvps?.length ?? 0} responded going
          {noResponse.length > 0 && isLeader && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {noResponse.length} need a reminder
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <RsvpGroup label="Going" people={going} />
          <RsvpGroup label="Maybe" people={maybe} />
          <RsvpGroup label="Can't go" people={notGoing} />
          <RsvpGroup label="No response" people={noResponse} />
        </div>
      </Card>

      {isLeader && (
        <Card className="p-0">
          <p className="px-4 pt-4 text-sm font-semibold text-ink-900">Attendance</p>
          <div className="divide-y divide-ink-100">
            {(groupMembers ?? []).map((m) => {
              const profile = m.profiles as unknown as { display_name: string | null }
              return (
                <AttendanceRow
                  key={m.user_id}
                  eventId={params.id}
                  userId={m.user_id}
                  name={profile?.display_name ?? 'Someone'}
                  currentStatus={attendanceByUser.get(m.user_id)}
                />
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function RsvpGroup({ label, people }: { label: string; people: { profiles: unknown }[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
        {label} ({people.length})
      </p>
      <ul className="space-y-0.5">
        {people.map((p, i) => {
          const profile = p.profiles as { display_name?: string | null } | null
          return (
            <li key={i} className="text-ink-500">
              {profile?.display_name ?? 'Someone'}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
