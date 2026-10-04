import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Refreshes the Supabase auth cookie on every request so a session started
// on one device (or before the PWA was installed) keeps working without the
// user having to sign in again — this is what makes auth "persistent" for a
// standalone Home Screen app, which has no access to another tab's session.
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth/confirm') || // email confirmation link lands here, pre-session
    path.startsWith('/opt-out') ||
    path.startsWith('/docs') || // Shortcut build guide is meant to be readable pre-login too
    path.startsWith('/api/opt-out') ||
    path.startsWith('/api/shortcut') || // authenticated via signed token, not a session
    path === '/manifest.webmanifest' ||
    path === '/sw.js' ||
    path.startsWith('/icons')

  // Public routes (including the Shortcut's own /api/shortcut calls) never
  // need a session, so they skip Supabase Auth entirely. This matters beyond
  // performance: if Supabase Auth is ever slow or unreachable (e.g. a paused
  // free-tier project), we don't want that to also break the one endpoint
  // the Shortcut depends on to fetch its batch.
  if (isPublic) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

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

  // Supabase Auth can occasionally be slow or flaky (e.g. right after a
  // paused free-tier project wakes back up). Without a timeout here, a slow
  // auth call hangs this edge function until Vercel force-kills it at 25s,
  // which the visitor sees as a dead "This request timed out" page instead
  // of anything Advance controls. Capping it at 8s means a flaky Supabase
  // instead sends the visitor to /login quickly — not perfect, but fast and
  // recoverable, rather than a frozen page.
  let user = null
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('auth timeout')), 8000)),
    ])
    user = result.data.user
  } catch {
    user = null
  }

  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', path)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
