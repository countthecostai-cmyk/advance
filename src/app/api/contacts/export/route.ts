import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { contactsToCsv } from '@/lib/csv'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('contacts')
    .select('*, contact_group_members(contact_groups(name))')
    .eq('user_id', user.id)
    .order('first_name')

  if (error) return jsonError(error.message, 500)

  const shaped = (data || []).map((c: any) => ({
    ...c,
    groups: (c.contact_group_members || []).map((m: any) => m.contact_groups).filter(Boolean),
  }))

  const csv = contactsToCsv(shaped)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'contacts.exported', metadata: { count: shaped.length } })

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="advance-contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
