import { z } from 'zod'

// Same "reject by default" convention as src/lib/validation.ts, kept in its
// own module since it's a self-contained product surface.

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  vertical: z.enum(['church', 'nonprofit', 'business', 'education', 'community']).default('church'),
})

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  description: z.string().trim().max(2000).optional().default(''),
  group_type: z.string().trim().max(60).optional().default('life_group'),
  meeting_schedule: z.string().trim().max(200).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
})

export const createEventSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(160),
  description: z.string().trim().max(2000).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
  starts_at: z.string().trim().min(1, 'Pick a date and time'),
})

export const setRsvpSchema = z.object({
  status: z.enum(['going', 'maybe', 'not_going']),
})

export const recordAttendanceSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(['present', 'absent', 'excused']),
})
