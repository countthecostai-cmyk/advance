import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { untyped } from '@/lib/untyped'

// "Catch Me Up" for one contact. Built only from what is actually stored —
// texts sent from Advance, plus the notes/commitments/follow-ups the user wrote.
// Nothing is guessed or invented. Only the contact's owner can read it.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: contact } = await supabase
    .from('contacts')
    .select('id, first_name, created_at')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()
  if (!contact) return jsonError('Contact not found', 404)

  const [{ data: texts }, { count: textCount }, { data: notes }] = await Promise.all([
    supabase
      .from('messages')
      .select('body, created_at, status')
      .eq('user_id', user.id)
      .eq('contact_id', params.id)
      .eq('status', 'handed_to_messages')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('contact_id', params.id)
      .eq('status', 'handed_to_messages'),
    untyped(supabase)
      .from('contact_notes')
      .select('id, kind, body, due_at, done_at, created_at')
      .eq('user_id', user.id)
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const all = (notes ?? []) as Array<{
    id: string
    kind: 'note' | 'commitment' | 'follow_up'
    body: string
    due_at: string | null
    done_at: string | null
    created_at: string
  }>
  const open = all.filter((n) => n.kind !== 'note' && !n.done_at)
  const today = new Date().toISOString().slice(0, 10)
  const overdue = open.filter((n) => n.due_at && n.due_at < today)

  const lines: string[] = []
  const last = texts?.[0]
  if (last) {
    const days = Math.floor((Date.now() - new Date(last.created_at).getTime()) / 86400_000)
    lines.push(
      `You last texted ${contact.first_name} ${days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}. You've sent ${textCount ?? 0} text${textCount === 1 ? '' : 's'} through Advance.`
    )
  } else {
    lines.push(`You haven't texted ${contact.first_name} through Advance yet.`)
  }
  if (open.length > 0) {
    lines.push(
      `${open.length} open item${open.length === 1 ? '' : 's'}${overdue.length ? `, ${overdue.length} overdue` : ''}.`
    )
  }
  if (all.length === 0) lines.push('No notes yet. Add what you talked about so you remember next time.')

  return NextResponse.json({
    summary: lines,
    recent_texts: texts ?? [],
    notes: all,
  })
}
