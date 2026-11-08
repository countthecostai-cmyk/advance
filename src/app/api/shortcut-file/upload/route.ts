import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { untyped } from '@/lib/untyped'

// POST /api/shortcut-file/upload — maintainer-only way to publish a hosted file.
// Needs the x-upload-key header to match SHORTCUT_UPLOAD_KEY.
// Body: { b64: <base64>, name?: 'advance-check' (default, must be a signed shortcut) | an icon name }
export const dynamic = 'force-dynamic'

const ICON_NAMES = ['apple-touch-icon', 'icon-192', 'icon-512', 'icon-maskable-512', 'favicon-16', 'favicon-32', 'favicon-ico']

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
  const name = typeof body?.name === 'string' ? body.name : 'advance-check'
  const bytes = Buffer.from(b64, 'base64')
  if (name === 'advance-check') {
    if (bytes.length < 100 || bytes.length > 2_000_000 || bytes.subarray(0, 4).toString('latin1') !== 'AEA1') {
      return NextResponse.json({ error: 'That is not a signed shortcut file' }, { status: 400 })
    }
  } else if (ICON_NAMES.includes(name)) {
    const isPng = bytes.subarray(1, 4).toString('latin1') === 'PNG'
    const isIco = bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1
    if (bytes.length < 50 || bytes.length > 2_000_000 || !(isPng || isIco)) {
      return NextResponse.json({ error: 'That is not an image' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'Unknown file name' }, { status: 400 })
  }
  const db = untyped(createServiceRoleSupabase())
  const del = await db.from('hosted_files').delete().eq('name', name)
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })
  const ins = await db.from('hosted_files').insert({ name, data_b64: b64, updated_at: new Date().toISOString() })
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
