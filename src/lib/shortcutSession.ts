import type { AppSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'
import { createShortcutToken } from '@/lib/tokens'
import { SHORTCUT_SESSION_TTL_HOURS, SHORTCUT_NAME } from '@/lib/constants'

export async function issueShortcutSession(
  supabase: AppSupabaseClient,
  userId: string,
  campaignId: string
): Promise<{ token: string; launchUrl: string; expiresAt: string }> {
  // Only one active session per campaign at a time — starting/resuming
  // always supersedes whatever came before it.
  await supabase
    .from('shortcut_sessions')
    .update({ status: 'revoked' })
    .eq('campaign_id', campaignId)
    .eq('status', 'active')

  const expiresAt = new Date(Date.now() + SHORTCUT_SESSION_TTL_HOURS * 60 * 60 * 1000)
  const { token, tokenHash } = createShortcutToken({
    uid: userId,
    cid: campaignId,
    exp: Math.floor(expiresAt.getTime() / 1000),
  })

  const { error } = await supabase.from('shortcut_sessions').insert({
    user_id: userId,
    campaign_id: campaignId,
    token_hash: tokenHash,
    status: 'active',
    expires_at: expiresAt.toISOString(),
  })
  if (error) throw new Error(error.message)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const successUrl = `${appUrl}/campaigns/${campaignId}?shortcut=success`
  const cancelUrl = `${appUrl}/campaigns/${campaignId}?shortcut=cancel`
  const errorUrl = `${appUrl}/campaigns/${campaignId}?shortcut=error`

  const launchUrl =
    `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}` +
    `&input=text&text=${encodeURIComponent(token)}` +
    `&x-success=${encodeURIComponent(successUrl)}` +
    `&x-cancel=${encodeURIComponent(cancelUrl)}` +
    `&x-error=${encodeURIComponent(errorUrl)}`

  return { token, launchUrl, expiresAt: expiresAt.toISOString() }
}

export async function revokeActiveShortcutSessions(supabase: AppSupabaseClient, campaignId: string) {
  await supabase.from('shortcut_sessions').update({ status: 'revoked' }).eq('campaign_id', campaignId).eq('status', 'active')
}
