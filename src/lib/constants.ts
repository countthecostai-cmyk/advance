// Central place for the limits referenced throughout the app and docs.
// Per-account overrides live in `profiles` (daily_send_cap etc); these are
// the hard ceilings nobody can raise from the UI.

export const HARD_MAX_RECIPIENTS_PER_CAMPAIGN = 500
export const HARD_MAX_DAILY_SEND_CAP = 1000
export const DEFAULT_CHUNK_SIZE = 20
export const MAX_CHUNK_SIZE = 50
export const DEFAULT_RATE_LIMIT_SECONDS = 3
export const SHORTCUT_SESSION_TTL_HOURS = 6
export const CAMPAIGN_NAME_MAX_LENGTH = 120
export const MESSAGE_TEMPLATE_MAX_LENGTH = 1000
export const CONTACT_NOTES_MAX_LENGTH = 2000
export const CSV_IMPORT_MAX_ROWS = 5000

export const SHORTCUT_NAME = process.env.NEXT_PUBLIC_SHORTCUT_NAME || 'Advance Sender'

// Optional: a shareable iCloud link (from Shortcuts app → Share → Copy iCloud
// Link) to a pre-built copy of the Advance Sender Shortcut. When this is set,
// onboarding shows one "Get Shortcut" button that installs the whole thing in
// one tap instead of walking the person through building it action-by-action.
// This link can ONLY be produced by actually building the Shortcut once
// inside Apple's own Shortcuts app on a real iPhone and sharing it — there is
// no way to generate or fake a valid .shortcut/iCloud link from code. Until
// someone does that one-time step and this env var is set, onboarding falls
// back to the manual build guide at /docs/shortcut.
export const SHORTCUT_ICLOUD_LINK = process.env.NEXT_PUBLIC_SHORTCUT_ICLOUD_LINK || null

export const PERSONALIZATION_TOKENS = ['{{first_name}}', '{{last_name}}'] as const
