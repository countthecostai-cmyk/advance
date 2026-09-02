import type { AppSupabaseClient } from '@/lib/supabase/server'
import type { Database, Profile } from '@/lib/types/database.types'
import { personalizeMessage, OPT_OUT_FOOTER } from '@/lib/personalization'
import { createOptOutToken } from '@/lib/tokens'

export interface ResolvedRecipient {
  contact_id: string | null
  phone_number: string
  first_name: string
  last_name: string
  personalized_message: string
}

export interface ResolveRecipientsResult {
  recipients: ResolvedRecipient[]
  excludedOptedOut: number
  excludedDuplicates: number
}

/**
 * Turns a campaign's (contact_ids + group_ids) selection into the final,
 * de-duplicated, suppression-filtered recipient list with personalized
 * message bodies already rendered. Used at campaign-create time; the result
 * is snapshotted into campaign_recipients so later edits to a contact never
 * change a message that's already queued or sent.
 */
export async function resolveCampaignRecipients(
  supabase: AppSupabaseClient,
  userId: string,
  profile: Profile,
  opts: {
    contactIds: string[]
    groupIds: string[]
    messageTemplate: string
    includeOptOutFooter: boolean
    isTestMode: boolean
  }
): Promise<ResolveRecipientsResult> {
  if (opts.isTestMode) {
    if (!profile.own_phone_number) {
      throw new Error('Set your own phone number in Settings before using Test Mode.')
    }
    const body = renderBody(opts.messageTemplate, profile.display_name || 'You', '', userId, profile.own_phone_number, opts.includeOptOutFooter)
    return {
      recipients: [
        {
          contact_id: null,
          phone_number: profile.own_phone_number,
          first_name: profile.display_name || 'You',
          last_name: '',
          personalized_message: body,
        },
      ],
      excludedOptedOut: 0,
      excludedDuplicates: 0,
    }
  }

  const contactIdSet = new Set(opts.contactIds)

  if (opts.groupIds.length > 0) {
    const { data: members } = await supabase
      .from('contact_group_members')
      .select('contact_id')
      .eq('user_id', userId)
      .in('group_id', opts.groupIds)
    for (const m of members || []) contactIdSet.add(m.contact_id)
  }

  if (contactIdSet.size === 0) {
    return { recipients: [], excludedOptedOut: 0, excludedDuplicates: 0 }
  }

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, phone_number, opted_out')
    .eq('user_id', userId)
    .in('id', Array.from(contactIdSet))

  if (error) throw new Error(error.message)

  const { data: suppressionRows } = await supabase.from('suppression_list').select('phone_number').eq('user_id', userId)
  const suppressed = new Set((suppressionRows || []).map((s) => s.phone_number))

  const seenPhones = new Set<string>()
  const recipients: ResolvedRecipient[] = []
  let excludedOptedOut = 0
  let excludedDuplicates = 0

  for (const c of contacts || []) {
    if (c.opted_out || suppressed.has(c.phone_number)) {
      excludedOptedOut++
      continue
    }
    if (seenPhones.has(c.phone_number)) {
      excludedDuplicates++
      continue
    }
    seenPhones.add(c.phone_number)

    const body = renderBody(
      opts.messageTemplate,
      c.first_name,
      c.last_name,
      userId,
      c.phone_number,
      opts.includeOptOutFooter
    )

    recipients.push({
      contact_id: c.id,
      phone_number: c.phone_number,
      first_name: c.first_name,
      last_name: c.last_name,
      personalized_message: body,
    })
  }

  return { recipients, excludedOptedOut, excludedDuplicates }
}

function renderBody(
  template: string,
  firstName: string,
  lastName: string,
  userId: string,
  phone: string,
  includeFooter: boolean
): string {
  let body = personalizeMessage(template, { first_name: firstName, last_name: lastName })
  if (includeFooter) {
    const token = createOptOutToken({ uid: userId, phone })
    const url = `${requireAppUrl()}/opt-out/${token}`
    body += OPT_OUT_FOOTER(url)
  }
  return body
}

function requireAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL is not configured on the server')
  return url.replace(/\/$/, '')
}
