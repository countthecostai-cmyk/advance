import type { AppSupabaseClient } from '@/lib/supabase/server'
import type { Database, Profile } from '@/lib/types/database.types'
import { HARD_MAX_DAILY_SEND_CAP, HARD_MAX_RECIPIENTS_PER_CAMPAIGN } from '@/lib/constants'

export interface RateLimitCheck {
  allowed: boolean
  reason?: string
}

/**
 * All abuse-prevention checks live here so campaign creation and campaign
 * start both enforce the same rules from one place. None of this is about
 * working around carrier/Apple anti-spam systems — it's the opposite: caps
 * that keep this account's own usage inside what a personal iPhone number
 * sending manually would plausibly look like.
 */
export async function checkCampaignRecipientCap(
  supabase: AppSupabaseClient,
  profile: Profile,
  recipientCount: number
): Promise<RateLimitCheck> {
  const cap = Math.min(profile.max_recipients_per_campaign, HARD_MAX_RECIPIENTS_PER_CAMPAIGN)
  if (recipientCount > cap) {
    return {
      allowed: false,
      reason: `This campaign has ${recipientCount} recipients, above your ${cap}-recipient campaign limit. Split it into smaller campaigns.`,
    }
  }
  return { allowed: true }
}

export async function checkDailySendCap(
  supabase: AppSupabaseClient,
  profile: Profile,
  additionalRecipients: number
): Promise<RateLimitCheck> {
  const cap = Math.min(profile.daily_send_cap, HARD_MAX_DAILY_SEND_CAP)
  const { data, error } = await supabase.rpc('daily_send_count', { p_user_id: profile.id })
  if (error) {
    return { allowed: false, reason: 'Could not verify your daily send limit. Try again.' }
  }
  const sentToday = (data as number) ?? 0
  if (sentToday + additionalRecipients > cap) {
    return {
      allowed: false,
      reason: `You've sent ${sentToday} messages in the last 24 hours (limit ${cap}). This campaign would push you over — wait or reduce recipients.`,
    }
  }
  return { allowed: true }
}

export async function checkMinTimeBetweenCampaigns(
  supabase: AppSupabaseClient,
  profile: Profile
): Promise<RateLimitCheck> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('started_at')
    .eq('user_id', profile.id)
    .not('started_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.started_at) return { allowed: true }

  const secondsSince = (Date.now() - new Date(data.started_at).getTime()) / 1000
  if (secondsSince < profile.min_seconds_between_campaigns) {
    const wait = Math.ceil(profile.min_seconds_between_campaigns - secondsSince)
    return {
      allowed: false,
      reason: `Please wait ${wait}s before starting another campaign — this cool-down prevents accidental double-sends.`,
    }
  }
  return { allowed: true }
}
