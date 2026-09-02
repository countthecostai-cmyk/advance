import { NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { verifyShortcutToken, hashShortcutToken } from '@/lib/tokens'
import type { Campaign, ShortcutSession } from '@/lib/types/database.types'

/**
 * Authenticates a request from the Shortcut. The Shortcut has no Supabase
 * session — it authenticates purely with the signed token embedded in the
 * URL it was launched with. This verifies the token's signature and expiry,
 * then cross-checks it against a live, non-revoked shortcut_sessions row so
 * pausing/stopping a campaign (which revokes the row) takes effect
 * immediately even though the token itself would still verify cryptographically.
 */
export async function requireShortcutSession(token: string) {
  const payload = verifyShortcutToken(token)
  if (!payload) {
    return { error: NextResponse.json({ error: 'This link has expired or is invalid. Reopen Advance and tap Send again.' }, { status: 401 }) } as const
  }

  const supabase = createServiceRoleSupabase()
  const tokenHash = hashShortcutToken(token)

  const { data: session, error } = await supabase
    .from('shortcut_sessions')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !session) {
    return { error: NextResponse.json({ error: 'Session not found.' }, { status: 401 }) } as const
  }
  if (session.user_id !== payload.uid || session.campaign_id !== payload.cid) {
    return { error: NextResponse.json({ error: 'Token/session mismatch.' }, { status: 401 }) } as const
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return { error: NextResponse.json({ error: 'This session expired. Reopen Advance and tap Send again.' }, { status: 401 }) } as const
  }
  if (session.status !== 'active') {
    // Paused/stopped/completed — this is the normal, expected way a
    // pause/stop takes effect mid-run: the next call the Shortcut makes
    // (fetch or progress) sees a non-active session and tells it to stop.
    return {
      error: NextResponse.json({ continue: false, reason: `Campaign session is ${session.status}.` }, { status: 200 }),
      session,
    } as const
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', session.campaign_id)
    .maybeSingle()

  if (campaignError || !campaign) {
    return { error: NextResponse.json({ error: 'Campaign not found.' }, { status: 404 }) } as const
  }

  return { supabase, session: session as ShortcutSession, campaign: campaign as Campaign } as const
}
