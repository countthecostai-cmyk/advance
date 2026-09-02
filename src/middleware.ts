import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and Next internals so the auth
     * cookie stays fresh app-wide, while still letting the matcher list above
     * (login/signup/opt-out/shortcut API/manifest/sw) opt out of the redirect.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/).*)',
  ],
}
