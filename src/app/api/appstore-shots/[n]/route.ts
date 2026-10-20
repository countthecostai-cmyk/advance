import { ImageResponse } from 'next/og'
import { SHOTS, W, H } from '@/lib/appstoreShots'

export const runtime = 'edge'

// GET /api/appstore-shots/1..4 — the App Store product-page screenshots,
// rendered on demand at Apple's 6.9" iPhone size (1320x2868). Public and
// CORS-open so App Store Connect can pull them in directly.
const FONT_BASE = 'https://cdn.jsdelivr.net/npm/@fontsource'

async function font(path: string) {
  const res = await fetch(`${FONT_BASE}/${path}`)
  if (!res.ok) throw new Error(`font ${path}: ${res.status}`)
  return res.arrayBuffer()
}

export async function GET(_req: Request, { params }: { params: { n: string } }) {
  const n = Number(params.n)
  const shot = SHOTS[n - 1]
  if (!shot) return new Response('Not found', { status: 404 })

  const [display, sans400, sans600, sans700, mono600] = await Promise.all([
    font('teko/files/teko-latin-700-normal.woff'),
    font('ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff'),
    font('ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff'),
    font('ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff'),
    font('ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff'),
  ])

  return new ImageResponse(shot(), {
    width: W,
    height: H,
    fonts: [
      { name: 'Display', data: display, weight: 700, style: 'normal' },
      { name: 'Sans', data: sans400, weight: 400, style: 'normal' },
      { name: 'Sans', data: sans600, weight: 600, style: 'normal' },
      { name: 'Sans', data: sans700, weight: 700, style: 'normal' },
      { name: 'Mono', data: mono600, weight: 600, style: 'normal' },
    ],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
