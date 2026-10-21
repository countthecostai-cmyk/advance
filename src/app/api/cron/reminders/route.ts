import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { untyped } from '@/lib/untyped'

// Runs on a schedule (Vercel Cron, see vercel.json). Creates in-app reminders so
// leaders never have to chase people:
//   1. RSVP nudge: people who haven't answered for an event in the next 3 days
//      (at most 2 nudges, at least 20 hours apart).
//   2. Heads-up: people who said "going" get a reminder the day before.
//   3. Follow-up: leaders hear who missed a meeting that just happened.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleSupabase()
  const db = untyped(admin)
  const now = new Date()
  const iso = (d: Date) => d.toISOString()
  const hours = (h: number) => new Date(now.getTime() + h * 3600_000)
  const counts = { rsvp_nudges: 0, heads_up: 0, followups: 0 }

  const when = (s: string) =>
    new Date(s).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })

  // 1 + 2: upcoming events
  const { data: upcoming } = await admin
    .from('events')
    .select('id, title, starts_at, group_id')
    .gt('starts_at', iso(now))
    .lt('starts_at', iso(hours(72)))
  for (const ev of upcoming ?? []) {
    const { data: rsvps } = await admin
      .from('rsvps')
      .select('id, user_id, status, reminder_count, last_reminded_at')
      .eq('event_id', ev.id)
    for (const r of rsvps ?? []) {
      if (r.status === 'no_response' && r.reminder_count < 2) {
        const last = r.last_reminded_at ? new Date(r.last_reminded_at).getTime() : 0
        if (now.getTime() - last < 20 * 3600_000) continue
        const { error } = await db.from('notifications').insert({
          user_id: r.user_id,
          kind: 'rsvp_reminder',
          title: `Can you make it? ${ev.title}`,
          body: `${when(ev.starts_at)}. Tap to let your group know.`,
          link: `/community/events/${ev.id}`,
          dedupe_key: `rsvp:${ev.id}:${r.user_id}:${r.reminder_count + 1}`,
        })
        if (!error) {
          await admin
            .from('rsvps')
            .update({ reminder_count: r.reminder_count + 1, last_reminded_at: iso(now) })
            .eq('id', r.id)
          counts.rsvp_nudges++
        }
      } else if ((r.status === 'going' || r.status === 'maybe') && new Date(ev.starts_at) < hours(30)) {
        const { error } = await db.from('notifications').insert({
          user_id: r.user_id,
          kind: 'event_heads_up',
          title: `Coming up: ${ev.title}`,
          body: `${when(ev.starts_at)}. See you there!`,
          link: `/community/events/${ev.id}`,
          dedupe_key: `headsup:${ev.id}:${r.user_id}`,
        })
        if (!error) counts.heads_up++
      }
    }
  }

  // 3: meetings that happened in the last 6–36 hours
  const { data: recent } = await admin
    .from('events')
    .select('id, title, group_id')
    .lt('starts_at', iso(hours(-6)))
    .gt('starts_at', iso(hours(-36)))
  for (const ev of recent ?? []) {
    if (!ev.group_id) continue
    const { data: absent } = await admin
      .from('attendance')
      .select('profiles(display_name)')
      .eq('event_id', ev.id)
      .eq('status', 'absent')
    if (!absent || absent.length === 0) continue
    const names = absent
      .map((a) => (a.profiles as unknown as { display_name: string | null } | null)?.display_name || 'Someone')
      .join(', ')
    const { data: leaders } = await admin
      .from('group_members')
      .select('user_id')
      .eq('group_id', ev.group_id)
      .eq('role', 'leader')
    for (const l of leaders ?? []) {
      const { error } = await db.from('notifications').insert({
        user_id: l.user_id,
        kind: 'missed_followup',
        title: `Check in: ${absent.length} missed ${ev.title}`,
        body: `${names}. A quick message goes a long way.`,
        link: `/community/events/${ev.id}`,
        dedupe_key: `missed:${ev.id}:${l.user_id}`,
      })
      if (!error) counts.followups++
    }
  }

  return NextResponse.json({ ok: true, ...counts })
}
