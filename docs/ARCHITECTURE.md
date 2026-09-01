# Architecture

## Stack

- **Next.js 14 (App Router, TypeScript)** — both the PWA frontend and the
  backend API (route handlers under `src/app/api/**`). One deployable app.
- **Supabase** (Postgres + Auth) — database, authentication, and Row Level
  Security. `@supabase/ssr` wires cookie-based sessions through Next's
  server components, route handlers, and middleware so auth persists for a
  standalone Home Screen PWA the same way it would for a normal website.
- **No SMS/messaging provider.** Sending happens exclusively via the user's
  own Apple Messages app, invoked through an iPhone Shortcut. See
  `docs/APPLE_SHORTCUTS.md`.

## Why Next.js on Vercel-style hosting instead of a separate frontend/backend

The spec calls for "a proper backend" with real tables, auth, and
authorization — Supabase provides that (Postgres + RLS + Auth), and Next.js
route handlers are the thinnest possible layer on top that still lets every
request be server-validated before touching the database (never trusting a
client-supplied user id, always re-deriving it from the session — see
`src/lib/apiAuth.ts`). This also keeps the whole system deployable as one
unit with no CORS/cross-origin complexity, which matters for a PWA that has
to work reliably when launched from a Home Screen icon.

## Data model

See `supabase/migrations/0001_init.sql` for the full schema with comments.
Summary of the non-obvious relationships:

- `campaign_recipients` **snapshots** the recipient's name, phone number,
  and fully-personalized message text at campaign-creation time. Editing a
  contact afterward never changes a message that's already queued or sent —
  this is deliberate, not an oversight.
- `messages` is a separate, durable log decoupled from `campaigns` — it's
  what backs the "Messages" history tab. Deleting a campaign never deletes
  its send history.
- `suppression_list` is keyed by phone number, independent of `contacts` —
  suppression survives a contact being deleted or re-imported.
- `shortcut_sessions` stores only a hash of its token, never the raw value —
  see `src/lib/tokens.ts`.

## Request flow for a normal (non-Shortcut) API call

1. Route handler calls `requireUser()` (`src/lib/apiAuth.ts`), which
   re-verifies the Supabase session server-side and loads the account's
   `profiles` row.
2. Request body is parsed through a `zod` schema (`src/lib/validation.ts`).
3. The Supabase client used is the **user-scoped** server client
   (`createServerSupabase()`), so every query is additionally constrained by
   Postgres Row Level Security — even a bug that forgot a `.eq('user_id', …)`
   filter could not leak another account's rows.
4. Mutations are audit-logged (`src/lib/audit.ts`) via a `SECURITY DEFINER`
   SQL function, since normal accounts only have `SELECT` on `audit_logs`.

## Request flow for a Shortcut callback

The Shortcut has no Supabase session. It authenticates with a signed,
single-use, expiring token instead (`src/lib/tokens.ts`,
`src/lib/shortcutAuth.ts`), and those routes use the **service-role**
Supabase client (`createServiceRoleSupabase()`) — which bypasses RLS by
design — but re-derive and check the owning `user_id`/`campaign_id` from the
verified token before touching any row. See `docs/APPLE_SHORTCUTS.md` for
the full flow.

## PWA shell

- `public/manifest.webmanifest` + Apple-specific `<meta>` tags in
  `src/app/layout.tsx` (`apple-mobile-web-app-capable`, apple-touch-icon,
  `viewport-fit=cover` for safe-area support).
- `public/sw.js` — network-first for navigations (falls back to a cached
  shell/offline page), cache-first for the static shell assets, and
  deliberately **never caches `/api/**` or Supabase traffic** — campaign
  progress and message status must always be live.
- `src/lib/supabase/middleware.ts` refreshes the auth cookie on every
  request, which is what makes sign-in "persistent" for a Home Screen app
  that has no other tab to inherit a session from.

## Directory map

```
src/
  app/
    (app)/             authenticated pages, shared bottom-nav layout
      home, contacts, campaigns, messages, settings
    api/                route handlers (the backend)
      contacts, groups, campaigns, messages, suppression, profile, audit-logs
      shortcut/[token]  Shortcut-facing endpoints (signed-token auth)
      opt-out/[token]   public self-serve opt-out
    login, signup        auth pages
    opt-out/[token]       public opt-out landing page
    docs/                 in-app Shortcut build guide + explainer
  components/            UI (ui/, nav/, contacts/, campaigns/, settings/)
  lib/                    shared server + shared logic
    supabase/             client/server/middleware Supabase wiring
    types/database.types.ts   hand-written types mirroring the SQL schema
    tokens.ts, shortcutAuth.ts, shortcutSession.ts   Shortcut token system
    campaignRecipients.ts  recipient resolution + personalization + footer
    rateLimit.ts, validation.ts, csv.ts, phone.ts, personalization.ts
supabase/migrations/      SQL: schema, RLS policies, helper functions
docs/                     this file, APPLE_SHORTCUTS.md, COMPLIANCE.md, DEPLOYMENT.md
```
