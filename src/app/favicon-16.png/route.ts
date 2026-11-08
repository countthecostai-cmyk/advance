import { serveHostedImage } from '@/lib/hostedImage'

export const dynamic = 'force-dynamic'

export async function GET() {
  return serveHostedImage('favicon-16', 'image/png')
}
