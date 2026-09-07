# Groups & Community module

A second product surface living in the same app, same account, and same
Supabase project as the mass-texting tool — reachable at `/community` and the
"Groups" tab in the bottom nav. It does not read, write, or depend on any
mass-texting table (`contacts`, `campaigns`, `messages`, etc.), and vice
versa; the only thing shared is the `profiles` table (extended with
`avatar_url`/`birthday`, nothing removed) and Supabase Auth.

## Why it exists

Built originally as a church/Life Group platform ("Automate the logistics.
Remember the context. Strengthen the relationship."), then generalized so
the same schema serves any organization that runs recurring groups —
businesses (teams), nonprofits (chapters/programs), schools (classes/clubs),
and community organizations (clubs/leagues) — without a fork or a rewrite.

## The vertical/terminology system

`organizations.vertical` (`church` | `business` | `nonprofit` | `education` |
`community`) is the only thing that changes per industry, and it only
changes words shown in the UI. See `src/lib/terminology.ts`:

- `Group` → `Team` / `Class` / `Chapter`
- `Leader` → `Manager` / `Instructor` / `Coordinator` / `Organizer`
- `Member` → `Teammate` / `Student`
- `Event` → `Meeting` / `Session`
- each vertical also ships its own list of group-type presets

Nothing about permissions, the schema, or automation logic branches on
vertical — only copy does. Church is the default everywhere (picker order,
onboarding placeholder copy).

## Data model

`organizations → ministries` (departments/programs) and
`organizations → groups → group_members` (people, with a `leader`/`member`
role) and `groups → events → rsvps` / `events → attendance`. See
`supabase/migrations/0004_community_schema.sql` for the full schema and
`0005_community_rls.sql` for Row Level Security.

Naming note: this module's `groups` table is unrelated to the mass-texting
surface's `contact_groups` table (which segments SMS contacts for
campaigns) — different table, different concept, kept visually and verbally
separate in the UI (the "Groups" tab vs. the "Groups" manager inside
Contacts).

## Privacy model

Row Level Security enforces, at the database level, that:

- A person only sees organizations/groups/events they belong to.
- An org admin can manage the org and its groups but does **not**
  automatically get to see anything a member hasn't explicitly shared here
  — there is no private messaging in this module yet, so this mostly matters
  once messaging/conversation memory (see below) is added.
- RSVP and attendance are visible to a group's own members/leaders and the
  org's admins, never to unrelated groups.

## What's built (Phase 1 — Core)

- Onboarding: pick a vertical, name the org, become its admin.
- Groups: create, list, join, view members and their role.
- Events: create under a group; every current group member gets a
  `no_response` RSVP row seeded automatically so leaders see who hasn't
  answered yet.
- RSVP: Going / Maybe / Can't Go, with "N haven't responded" surfaced to
  leaders on both the group page and the event page.
- Attendance: a leader marks Present / Absent / Excused per member per
  event.

## Not yet built

Everything from the original Advance product spec's later phases: in-app
messaging, SMS-based RSVP reminders and automated follow-ups (an automation
*engine*, distinct from the mass-texting tool's manual campaigns),
conversation memory / "Catch Me Up" / relationship profiles, prayer
requests, polls, iOS Shortcuts deep links for this module specifically, and
analytics. None of these currently exist for the Groups/Community surface —
don't assume they do because the mass-texting tool has some superficially
similar pieces (it does not share code with this module).

## Where things live

- `src/lib/terminology.ts` — the vertical → vocabulary map.
- `src/lib/community/` — `requireOrg.ts` (auth + org-context helper for API
  routes, mirrors `src/lib/apiAuth.ts`) and `validation.ts` (zod schemas).
- `src/app/api/community/**` — REST route handlers (same pattern as the rest
  of the app: `requireOrgContext()` → validate → mutate → `logAudit`).
- `src/app/(app)/community/**` — pages. Server components fetch directly via
  `createServerSupabase()`; mutations go through the API routes above via
  client-side `fetch`, matching how `src/components/contacts/*` already
  talks to `/api/contacts` and `/api/groups`.
