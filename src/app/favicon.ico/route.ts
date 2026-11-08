import { serveHostedImage } from '@/lib/hostedImage'

export const dynamic = 'force-dynamic'

export async function GET() {
  return serveHostedImage('favicon-ico', 'image/x-icon')
}
