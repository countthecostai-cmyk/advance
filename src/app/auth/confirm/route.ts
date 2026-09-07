import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// This is the page the confirmation-email link actually points to.
// Supabase's email templates need to link here as:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/home
// (the default "Confirmation URL" template does NOT do this out of the box —
// see docs/DEPLOYMENT.md for the exact template to paste into the Supabase
// dashboard). Without a route like this one, clicking the email link has
// nowhere to actually exchange the token for a signed-in session — the user
// lands on the site still logged out, which is what "the confirmation email
// doesn't work" almost always means in practice.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/home'

  if (token_hash && type) {
    const supabase = createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
