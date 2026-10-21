import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { untyped } from '@/lib/untyped'

const schema = z.object({
  kind: z.enum(['note', 'commitment', 'follow_up']),
  body: z.string().trim().min(1, 'Write something first').max(1000),
  due_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()
  if (!contact) return jsonError('Contact not found', 404)

  const { error } = await untyped(supabase).from('contact_notes').insert({
    user_id: user.id,
    contact_id: params.id,
    kind: parsed.data.kind,
    body: parsed.data.body,
    due_at: parsed.data.due_at ?? null,
  })
  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ ok: true })
}
