import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { untyped } from '@/lib/untyped'

// POST /api/shortcut-file/upload — maintainer-only way to publish a new signed
// shortcut file. Needs the x-upload-key header to match SHORTCUT_UPLOAD_KEY.
// Body: { b64: <base64 of a signed .shortcut file> }
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const expected = process.env.SHORTCUT_UPLOAD_KEY || ''
  const given = request.headers.get('x-upload-key') || ''
  const a = Buffer.from(expected)
  const b = Buffer.from(given)
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const b64 = typeof body?.b64 === 'string' ? body.b64 : ''
  const bytes = Buffer.from(b64, 'base64')
  if (bytes.length < 100 || bytes.length > 2_000_000 || bytes.subarray(0, 4).toString('latin1') !== 'AEA1') {
    return NextResponse.json({ error: 'That is not a signed shortcut file' }, { status: 400 })
  }
  const { error } = await untyped(createServiceRoleSupabase())
    .from('hosted_files')
    .upsert({ name: 'advance-check', data_b64: b64, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
