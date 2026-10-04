import { NextResponse } from 'next/server'

// The Advance mark as a classic multi-size .ico, for browsers that only ever request /favicon.ico directly.
// Embedded as base64 (rather than a static file under /public) because this
// project's deploy pipeline here pushes source text, not binary blobs. Kept
// tiny on purpose: a hand-reduced 3-color palette (background / white / brand
// blue) so the PNG compresses to a couple KB instead of tens of KB. Served
// with a long immutable cache since the bytes never change without a new
// deploy.
const BASE64 =
  'AAABAAEAEBAAAAAAIAB6AAAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAQAAAAEAgCAAAAkJFoNgAAAEFJREFUeJxj5OYVZiAFMJGkelhr+PLpzZdPb2hmA9xsrJawYKrm4RPBo4ERLablC1/C2Q/7xZH1Y9dAEAyZiMMDAPOaF7uQaOthAAAAAElFTkSuQmCC'

export const dynamic = 'force-static'

export async function GET() {
  const buffer = Buffer.from(BASE64, 'base64')
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
