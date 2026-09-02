import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Refreshes the Supabase auth cookie on every request so a session started
// on one device (or before the PWA was installed) keeps working without the
// user having to sign in again — this is what makes auth "persistent" for a
// standalone Home Screen app, which has no access to another tab's session.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/opt-out') ||
    path.startsWith('/docs') || // Shortcut build guide is meant to be readable pre-login too
    path.startsWith('/api/opt-out') ||
    path.startsWith('/api/shortcut') || // authenticated via signed token, not a session
    path === '/manifest.webmanifest' ||
    path === '/sw.js' ||
    path.startsWith('/icons')

  if (!user && !isPublic) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', path)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
