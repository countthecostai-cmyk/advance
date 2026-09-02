import { z } from 'zod'
import {
  CAMPAIGN_NAME_MAX_LENGTH,
  CONTACT_NOTES_MAX_LENGTH,
  MESSAGE_TEMPLATE_MAX_LENGTH,
  HARD_MAX_RECIPIENTS_PER_CAMPAIGN,
  MAX_CHUNK_SIZE,
} from '@/lib/constants'

// Every API route parses its body through one of these schemas before
// touching the database. Reject-by-default: unknown fields, wrong types, and
// out-of-range values all fail closed with a 400 rather than being coerced.

export const contactInputSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(80),
  last_name: z.string().trim().max(80).optional().default(''),
  phone_number: z.string().trim().min(3).max(32),
  notes: z.string().trim().max(CONTACT_NOTES_MAX_LENGTH).optional().default(''),
  consent_status: z.enum(['unknown', 'given', 'implied', 'declined']).optional().default('unknown'),
  consent_source: z.string().trim().max(200).optional(),
  group_ids: z.array(z.string().uuid()).max(50).optional().default([]),
})

export const contactUpdateSchema = contactInputSchema.partial().extend({
  opted_out: z.boolean().optional(),
  opted_out_reason: z.string().trim().max(200).optional(),
})

export const groupInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
})

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1).max(CAMPAIGN_NAME_MAX_LENGTH),
  message_template: z.string().trim().min(1).max(MESSAGE_TEMPLATE_MAX_LENGTH),
  contact_ids: z.array(z.string().uuid()).max(HARD_MAX_RECIPIENTS_PER_CAMPAIGN).optional().default([]),
  group_ids: z.array(z.string().uuid()).max(50).optional().default([]),
  scheduled_at: z.string().datetime().nullable().optional(),
  is_test_mode: z.boolean().optional().default(false),
  rate_limit_seconds: z.number().int().min(1).max(60).optional(),
  chunk_size: z.number().int().min(1).max(MAX_CHUNK_SIZE).optional(),
  include_opt_out_footer: z.boolean().optional().default(true),
})

export const campaignUpdateSchema = z.object({
  name: z.string().trim().min(1).max(CAMPAIGN_NAME_MAX_LENGTH).optional(),
  message_template: z.string().trim().min(1).max(MESSAGE_TEMPLATE_MAX_LENGTH).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  rate_limit_seconds: z.number().int().min(1).max(60).optional(),
  chunk_size: z.number().int().min(1).max(MAX_CHUNK_SIZE).optional(),
  include_opt_out_footer: z.boolean().optional(),
})

export const csvImportRowSchema = z.object({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().optional().default(''),
  phone_number: z.string().trim().min(3),
  notes: z.string().trim().optional().default(''),
  group: z.string().trim().optional().default(''),
  consent_status: z.string().trim().optional().default('unknown'),
})

export const shortcutProgressSchema = z.object({
  recipient_id: z.string().uuid(),
  result: z.enum(['handed_to_messages', 'error']),
  error_message: z.string().trim().max(500).optional(),
})

export const shortcutCompleteSchema = z.object({
  reason: z.enum(['finished', 'stopped_by_user', 'error']).optional().default('finished'),
})

export type ContactInput = z.infer<typeof contactInputSchema>
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>
