# Compliance & abuse prevention

Advance sends real texts from a real personal phone number. That's exactly why
it needs guardrails a "just call an SMS API" tool wouldn't — a personal
iPhone number that starts looking like a spam operation can get rate-limited
or flagged by carriers and by Apple's own iMessage anti-abuse systems, on top
of the legal exposure of unsolicited texting (TCPA in the US, and equivalent
rules elsewhere). None of what follows is about evading those protections —
it's about staying inside what a real person texting real contacts looks
like, deliberately.

## Consent tracking

Every contact has a `consent_status` (`unknown` / `given` / `implied` /
`declined`) plus an append-only `consents` history table recording every
change, when, and how it was recorded. Consent is opt-in by default
(`unknown`) — nothing about creating or importing a contact marks them as
consenting. It's on the account owner to set this accurately; Advance doesn't
have signals to detect it automatically since there is no reply-webhook (see
below).

## Opt-out / STOP handling — and its real limitation

**Apple gives no third-party app access to incoming Messages content.**
There is no webhook, no public API, no way for Advance (or any Shortcut) to
see a "STOP" reply arrive. This is a hard platform limitation, not a gap in
this build — it's the direct consequence of not using Twilio or a virtual
number (which is exactly what the product brief asked for).

What Advance does instead, deliberately layered:

1. **A self-serve opt-out link** in every outgoing message's footer (toggle
   per campaign), pointing to a public, unauthenticated page
   (`/opt-out/:token`) that suppresses the number the moment the recipient
   taps it — no login, no app required on their end.
2. **"Reply STOP" is stated in the same footer** as a manual fallback for
   anyone who prefers it. Because Advance cannot see that reply, **the account
   owner has to notice it themselves** (in their own Messages app) and mark
   the contact opted out in Advance (Contacts → contact → "Mark opted out," or
   Settings → Suppression list → add manually).
3. Once suppressed (either path), the phone number goes into
   `suppression_list`, keyed by number rather than by contact — so it stays
   suppressed even if the contact is deleted, edited, or re-imported later.

## Suppression list

Independent from `contacts.opted_out` so a suppression survives contact
deletion/re-import. Checked at **campaign-creation time** (recipients are
filtered before a campaign is even created) — not silently at send time,
so the recipient count shown before confirmation is always the real number
of people who will actually be messaged. Removing an entry is a separate,
explicit, audit-logged action (`DELETE /api/suppression/:id`) — nothing
re-subscribes a number as a side effect of another action.

## Rate limits & campaign caps

Configured per account in `profiles`, enforced server-side (never trust a
client-supplied count) on both campaign creation and campaign start:

- `max_recipients_per_campaign` (default 150, hard ceiling 500) — forces
  very large sends to be split into multiple campaigns.
- `daily_send_cap` (default 300, hard ceiling 1000) — computed from actual
  `handed_to_messages` recipients in the last 24 hours
  (`daily_send_count()` SQL function), not from campaigns created.
- `min_seconds_between_campaigns` (default 60s) — a cooldown against
  accidental double-sends (e.g. double-tapping Send).
- Per-campaign `rate_limit_seconds` (advisory pacing between individual
  sends) and `chunk_size` (max recipients per Shortcut run, default 20) —
  see `docs/APPLE_SHORTCUTS.md` for why chunking exists.

None of these are user-editable from the UI on purpose (see
`src/app/api/profile/route.ts`) — raising your own limits is intentionally
not self-serve.

## Audit logs

Append-only (`audit_logs`, no UPDATE/DELETE policy for any role, writes only
via the `write_audit_log` SQL function). Every contact/campaign mutation,
every Shortcut callback, and every opt-out is logged with actor
(`user` / `system` / `shortcut`), action, entity, and metadata. Visible
read-only in Settings → Audit log.

## Abuse prevention in the API layer

- Every request re-derives the authenticated user server-side
  (`requireUser()`) — nothing trusts a client-supplied user id.
- All input is validated with `zod` schemas before touching the database
  (`src/lib/validation.ts`); unknown/malformed fields are rejected, not
  coerced.
- Row Level Security on every table scopes all normal reads/writes to
  `auth.uid()` — one account cannot read or modify another's contacts,
  campaigns, or messages, even via a crafted request, because Postgres
  itself enforces it below the API layer.
- The Shortcut-facing endpoints use a separate, signed, single-use, expiring
  token instead of a Supabase session (see `docs/APPLE_SHORTCUTS.md`), with
  ownership re-checked against that token on every call.
- The public opt-out endpoint is a POST triggered by an explicit tap, not a
  bare page-load GET, so link-scanning/prefetching by mail or security
  clients can't silently opt someone out (or, in the other direction,
  silently NOT opt them out when they meant to).
