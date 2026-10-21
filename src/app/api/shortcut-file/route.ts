import { NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { untyped } from '@/lib/untyped'

// GET /api/shortcut-file — the signed "Advance Check" iPhone shortcut, so
// anyone can install it with one tap. It holds no personal data: each person's
// link is passed in when they set it up and stored on their own phone.
export const dynamic = 'force-dynamic'

export async function GET() {
  const { data } = await untyped(createServiceRoleSupabase())
    .from('hosted_files')
    .select('data_b64')
    .eq('name', 'advance-check')
    .maybeSingle()
  if (!data?.data_b64) return new NextResponse('Not found', { status: 404 })
  const bytes = Buffer.from(data.data_b64 as string, 'base64')
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/vnd.apple.shortcut',
      'Content-Disposition': 'attachment; filename="Advance Check.shortcut"',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
