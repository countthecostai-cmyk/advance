import { serveHostedImage } from '@/lib/hostedImage'

export const dynamic = 'force-dynamic'

export async function GET() {
  return serveHostedImage('icon-maskable-512', 'image/png')
}
