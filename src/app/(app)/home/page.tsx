import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

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

  const needsSetup = !profile?.shortcut_configured_at
  const needsOwnNumber = !profile?.own_phone_number

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Hi{profile?.display_name ? `, ${profile.display_name}` : ''} 👋</h1>
      <p className="mb-4 text-sm text-ink-400">Messages send from your own iPhone number via Apple Messages.</p>

      {(needsSetup || needsOwnNumber) && (
        <Card className="mb-4 border-brand-100 bg-brand-50">
          <p className="mb-2 text-sm font-semibold text-brand-900">Finish setup to start sending</p>
          <p className="mb-3 text-xs text-brand-800">
            {needsSetup && 'Install the Advance Sender Shortcut on your iPhone. '}
            {needsOwnNumber && 'Add your own phone number for test mode.'}
          </p>
          <Link href="/settings">
            <Button size="sm">Finish setup</Button>
          </Link>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link href="/contacts">
          <Card className="text-center">
            <p className="text-2xl font-bold text-ink-900">{contactCount ?? 0}</p>
            <p className="text-xs text-ink-400">Contacts</p>
          </Card>
        </Link>
        <Link href="/campaigns">
          <Card className="text-center">
            <p className="text-2xl font-bold text-ink-900">{activeCampaigns?.length ?? 0}</p>
            <p className="text-xs text-ink-400">Active campaigns</p>
          </Card>
        </Link>
      </div>

      <div className="mb-5 flex gap-3">
        <Link href="/campaigns/new" className="flex-1">
          <Button fullWidth>New campaign</Button>
        </Link>
        <Link href="/contacts" className="flex-1">
          <Button fullWidth variant="secondary">
            Add contact
          </Button>
        </Link>
      </div>

      {recentCampaigns && recentCampaigns.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-900">Recent campaigns</p>
          <div className="flex flex-col gap-2">
            {recentCampaigns.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between rounded-xl2 border border-ink-100 bg-white p-3">
                <span className="text-sm font-medium text-ink-900">{c.name}</span>
                <Badge>{c.status}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
