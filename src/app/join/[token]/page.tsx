import { createServerSupabase, createServiceRoleSupabase } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/tokens'
import { getTerminology } from '@/lib/terminology'
import { JoinInvite } from './JoinInvite'

export const metadata = { title: 'You’re invited' }
export const dynamic = 'force-dynamic'

// Public landing page for a group invite link (/join/<token>). Works whether
// or not the person already has an Advance account: if they don't, joining
// creates one (same no-password flow as /signup).
export default async function JoinPage({ params }: { params: { token: string } }) {
  const invite = verifyInviteToken(params.token)

  let orgName: string | null = null
  let groupName: string | null = null
  let groupNoun = 'group'
  let meeting: string | null = null

  if (invite) {
    const admin = createServiceRoleSupabase()
    const { data: org } = await admin.from('organizations').select('name, vertical').eq('id', invite.o).maybeSingle()
    if (org) {
      orgName = org.name
      groupNoun = getTerminology(org.vertical).groupNoun.toLowerCase()
      if (invite.g) {
        const { data: group } = await admin
          .from('groups')
          .select('name, meeting_schedule, organization_id')
          .eq('id', invite.g)
          .maybeSingle()
        if (group && group.organization_id === invite.o) {
          groupName = group.name
          meeting = group.meeting_schedule
        } else {
          orgName = null
        }
      }
    }
  }

  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10 safe-top safe-bottom safe-x">
      {!orgName ? (
        <div className="text-center">
          <p className="mono-label mb-2 text-[10.5px] text-brand-600">Invite</p>
          <h1 className="font-display mb-2 text-3xl font-bold uppercase text-ink-900">Link not valid</h1>
          <p className="text-sm text-ink-500">
            This invite link isn&apos;t working. Ask the person who sent it for a new one.
          </p>
        </div>
      ) : (
        <>
          <p className="mono-label mb-2 text-[10.5px] text-brand-600">You&apos;re invited</p>
          <h1 className="font-display mb-1 text-4xl font-bold uppercase leading-none text-ink-900">
            {groupName ?? orgName}
          </h1>
          <p className="mb-6 text-sm text-ink-500">
            {groupName ? `${orgName}${meeting ? ` · ${meeting}` : ''}` : `Join ${orgName} on Advance`}
          </p>
          <JoinInvite token={params.token} signedIn={!!user} groupNoun={groupNoun} />
        </>
      )}
    </div>
  )
}
