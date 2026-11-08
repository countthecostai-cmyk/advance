import { NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { untyped } from '@/lib/untyped'

// Serves an image stored in the hosted_files table (uploaded through
// /api/shortcut-file/upload). Lets us swap brand icons without pushing binaries.
export async function serveHostedImage(name: string, contentType: string) {
  const { data } = await untyped(createServiceRoleSupabase())
    .from('hosted_files')
    .select('data_b64')
    .eq('name', name)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.data_b64) return new NextResponse('Not found', { status: 404 })
  const bytes = Buffer.from(data.data_b64 as string, 'base64')
  return new NextResponse(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  })
}
