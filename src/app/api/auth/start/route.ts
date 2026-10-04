import { randomUUID, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceRoleSupabase } from '@/lib/supabase/server'
import { validateAndNormalizePhone } from '@/lib/phone'
import { z } from 'zod'

// POST /api/auth/start — the entire "sign up" flow in one call, with nothing
// to type first. There's no email and no password, so there's nothing for
// Supabase's public sign-up endpoint to do here. Instead we use the
// service-role key (already configured on this server for the Shortcut
// webhooks) to create a real Supabase Auth user behind the scenes with a
// throwaway, never-shown email+password pair, then sign that pair in
// ourselves to hand back a normal session cookie.
//
// display_name and phone are both optional — a name/number can be added
// later from Settings (TestModeCard already has a field for the phone
// number). Deliberately NOT gated behind any Supabase Auth dashboard
// setting (like "Allow anonymous sign-ins") — the admin user-creation API
// works regardless of which sign-in methods are toggled on.
const bodySchema = z.object({
  display_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(32).optional(),
})

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 })
  }

  let phoneE164: string | null = null
  if (parsed.data.phone) {
    const phone = validateAndNormalizePhone(parsed.data.phone)
    if (!phone.valid || !phone.e164) {
      return NextResponse.json({ error: phone.reason || 'Invalid phone number' }, { status: 400 })
    }
    phoneE164 = phone.e164
  }

  const admin = createServiceRoleSupabase()

  // Internal-only identifier — never emailed, never shown to the person.
  const internalEmail = `${randomUUID()}@users.advance.internal`
  const internalPassword = randomBytes(24).toString('base64url')

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: internalEmail,
    password: internalPassword,
    email_confirm: true,
    user_metadata: parsed.data.display_name ? { display_name: parsed.data.display_name } : undefined,
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || 'Could not create account' }, { status: 500 })
  }

  // The on_auth_user_created trigger already inserted a profiles row, but
  // its display_name fallback (coalesce to the email's local part) was
  // written for real human emails — with our throwaway
  // "<uuid>@users.advance.internal" address it would leave the raw UUID
  // sitting in display_name. Always overwrite it explicitly here (to null
  // when no name was given) so that bug can't surface in the UI.
  await admin
    .from('profiles')
    .update({
      display_name: parsed.data.display_name || null,
      ...(phoneE164 ? { own_phone_number: phoneE164 } : {}),
    })
    .eq('id', created.user.id)

  // Now sign in as that brand-new user through the normal (cookie-writing)
  // server client, so the response carries a real, working session.
  const supabase = createServerSupabase()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password: internalPassword,
  })

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
