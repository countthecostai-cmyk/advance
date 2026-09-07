import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getTerminology } from '@/lib/terminology'
import { NewEventForm } from './NewEventForm'

export default async function NewCommunityEventPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase.from('groups').select('organizations(vertical)').eq('id', params.id).maybeSingle()
  const t = getTerminology((group?.organizations as unknown as { vertical: string })?.vertical)

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold text-ink-900">Create {t.eventNoun === 'Event' ? 'an' : 'a'} {t.eventNoun.toLowerCase()}</h1>
      <NewEventForm groupId={params.id} terminology={t} />
    </div>
  )
}
