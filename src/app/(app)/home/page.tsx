import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AdvanceIcon } from '@/components/ui/Icons'
import { Notifications } from '@/components/home/Notifications'
import { untyped } from '@/lib/untyped'

export default async function HomePage() {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ count: contactCount }, { data: profile }, { data: activeCampaigns }, { data: recentCampaigns }] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('opted_out', false),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('campaigns').select('*').eq('user_id', user!.id).in('status', ['queued', 'sending', 'paused']),
    supabase.from('campaigns').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
  ])

  const { data: reminders } = await untyped(supabase)
    .from('notifications')
    .select('id, title, body, link')
    .eq('user_id', user!.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="px-4 pt-4">
      <p className="mono-label text-[10px] text-brand-600">Mission status — active</p>
      <h1 className="font-display mt-0.5 text-3xl font-bold uppercase tracking-wide text-ink-900">
        {profile?.display_name || 'Andre'}
      </h1>
      <p className="mb-4 mt-1 text-sm text-ink-400">Messages send from your own iPhone number via Apple Messages.</p>

      <Notifications items={reminders ?? []} />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link href="/contacts">
          <Card className="text-center">
            <p className="readout text-2xl font-bold text-brand-600">{contactCount ?? 0}</p>
            <p className="mono-label mt-1 text-[9px] text-ink-400">Contacts</p>
          </Card>
        </Link>
        <Link href="/campaigns">
          <Card className="text-center">
            <p className="readout text-2xl font-bold text-brand-600">{activeCampaigns?.length ?? 0}</p>
            <p className="mono-label mt-1 text-[9px] text-ink-400">Active advances</p>
          </Card>
        </Link>
      </div>

      <div className="mb-5 flex gap-3">
        <Link href="/campaigns/new" className="flex-1">
          <Button fullWidth className="gap-2">
            <AdvanceIcon className="h-4 w-4" />
            New advance
          </Button>
        </Link>
        <Link href="/contacts" className="flex-1">
          <Button fullWidth variant="secondary">
            Add contact
          </Button>
        </Link>
      </div>

      {recentCampaigns && recentCampaigns.length > 0 && (
        <div>
          <p className="mono-label mb-2 flex items-center gap-2 text-[9.5px] text-ink-500">
            Recent advances
            <span className="h-px flex-1 bg-ink-200" />
          </p>
          <div className="flex flex-col gap-2">
            {recentCampaigns.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="cut-corner flex items-center justify-between border border-ink-200 bg-ink-100 p-3"
              >
                <span className="text-sm font-semibold text-ink-900">{c.name}</span>
                <Badge>{c.status}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
