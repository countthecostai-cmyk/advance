import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { untyped } from '@/lib/untyped'

// PATCH { done: boolean } toggles an item done; DELETE removes it.
export async function PATCH(request: NextRequest, { params }: { params: { noteId: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const parsed = z.object({ done: z.boolean() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError('Invalid input')
  const { error } = await untyped(auth.supabase)
    .from('contact_notes')
    .update({ done_at: parsed.data.done ? new Date().toISOString() : null })
    .eq('id', params.noteId)
    .eq('user_id', auth.user.id)
  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: { noteId: string } }) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { error } = await untyped(auth.supabase)
    .from('contact_notes')
    .delete()
    .eq('id', params.noteId)
    .eq('user_id', auth.user.id)
  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ ok: true })
}
