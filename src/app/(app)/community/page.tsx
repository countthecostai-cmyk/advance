import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { getTerminology } from '@/lib/terminology'
import type { RsvpStatus } from '@/lib/types/database.types'

export default async function CommunityPage() {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug, vertical)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) redirect('/community/onboarding')

  const org = membership.organizations as unknown as { id: string; name: string; vertical: string }
  const t = getTerminology(org.vertical)

  const { data: myGroupRows } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
  const groupIds = (myGroupRows ?? []).map((g) => g.group_id)

  const { data: upcomingEvents } = groupIds.length
    ? await supabase
        .from('events')
        .select('id, title, starts_at, location')
        .in('group_id', groupIds)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5)
    : { data: [] }

  const eventIds = (upcomingEvents ?? []).map((e) => e.id)
  const { data: myRsvps } = eventIds.length
    ? await supabase.from('rsvps').select('event_id, status').eq('user_id', user.id).in('event_id', eventIds)
    : { data: [] }
  const rsvpByEvent = new Map((myRsvps ?? []).map((r) => [r.event_id, r.status as RsvpStatus]))

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">{org.name}</h1>
      <p className="mb-4 text-sm text-ink-400">{t.tagline}</p>

      {membership.role !== 'member' && (
        <Card className="mb-4">
          <p className="mb-3 text-sm font-semibold text-ink-900">Get started</p>
          <div className="flex gap-2">
            <Link href="/community/groups/new" className="flex-1">
              <Button size="sm" fullWidth>
                New {t.groupNoun.toLowerCase()}
              </Button>
            </Link>
            <Link href="/community/groups" className="flex-1">
              <Button size="sm" variant="secondary" fullWidth>
                View {t.groupNounPlural.toLowerCase()}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <p className="mb-2 text-sm font-semibold text-ink-900">Your upcoming {t.eventNounPlural.toLowerCase()}</p>
      {!upcomingEvents?.length ? (
        <EmptyState
          icon="📅"
          title={`No upcoming ${t.eventNounPlural.toLowerCase()}`}
          description={`Join a ${t.groupNoun.toLowerCase()} to see ${t.eventNounPlural.toLowerCase()} here.`}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {upcomingEvents.map((event) => (
            <Link
              key={event.id}
              href={`/community/events/${event.id}`}
              className="flex items-center justify-between rounded-xl2 border border-ink-100 bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium text-ink-900">{event.title}</p>
                <p className="text-xs text-ink-400">
                  {new Date(event.starts_at).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </div>
              <RsvpBadge status={rsvpByEvent.get(event.id)} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function RsvpBadge({ status }: { status?: RsvpStatus }) {
  const map: Record<string, { label: string; className: string }> = {
    going: { label: 'Going', className: 'bg-emerald-100 text-emerald-700' },
    maybe: { label: 'Maybe', className: 'bg-amber-100 text-amber-700' },
    not_going: { label: "Can't go", className: 'bg-ink-100 text-ink-500' },
  }
  const info = status ? map[status] : undefined
  if (!info) return <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500">RSVP needed</span>
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${info.className}`}>{info.label}</span>
}
