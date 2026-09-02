import { NextRequest, NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/apiAuth'
import { validateAndNormalizePhone } from '@/lib/phone'
import { logAudit } from '@/lib/audit'
import type { Profile } from '@/lib/types/database.types'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(100).optional(),
  own_phone_number: z.string().trim().max(32).nullable().optional(),
  timezone: z.string().trim().max(64).optional(),
  // Set by the Settings page's "I've built the Shortcut" confirmation. A
  // boolean flag rather than accepting a client-supplied timestamp — the
  // server stamps `now()` itself.
  mark_shortcut_configured: z.boolean().optional(),
})

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  return NextResponse.json({ profile: auth.profile })
}

// PATCH /api/profile — deliberately narrow. Compliance limits
// (daily_send_cap, max_recipients_per_campaign, min_seconds_between_campaigns)
// are NOT editable here — see supabase/migrations/0001_init.sql comments and
// docs/COMPLIANCE.md for why that's a feature, not an oversight.
export async function PATCH(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const body = await request.json().catch(() => null)
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.errors[0]?.message || 'Invalid input')

  const update: Partial<Profile> = {}
  if (parsed.data.display_name !== undefined) update.display_name = parsed.data.display_name
  if (parsed.data.timezone !== undefined) update.timezone = parsed.data.timezone
  if (parsed.data.own_phone_number !== undefined) {
    if (parsed.data.own_phone_number === null || parsed.data.own_phone_number === '') {
      update.own_phone_number = null
    } else {
      const phone = validateAndNormalizePhone(parsed.data.own_phone_number)
      if (!phone.valid || !phone.e164) return jsonError(phone.reason || 'Invalid phone number')
      update.own_phone_number = phone.e164
    }
  }
  if (parsed.data.mark_shortcut_configured) {
    update.shortcut_configured_at = new Date().toISOString()
  }

  const { data: profile, error } = await supabase.from('profiles').update(update).eq('id', user.id).select().single()
  if (error) return jsonError(error.message, 500)

  await logAudit(supabase, { userId: user.id, actor: 'user', action: 'profile.updated', metadata: { fields: Object.keys(update) } })

  return NextResponse.json({ profile })
}
