# Advance

A mobile-first Progressive Web App for managing mass-texting campaigns that
actually send through **Apple Messages, from the user's own iPhone number**
— via a companion iPhone Shortcut, using only publicly supported Apple
capabilities. No Twilio, no virtual numbers, no private APIs.

## Why it's built this way

Apple gives no public API for a website or server to send an iMessage/SMS as
someone's personal phone number. The only supported path is the Shortcuts
app's own **Send Message** action, run on the user's own phone. So the
product is split cleanly:

- **This PWA** owns everything that isn't literally the send action:
  contacts, groups, campaigns, personalization, scheduling, the queue,
  compliance (consent/opt-out/suppression/rate limits/audit), and history.
- **A Shortcut you build once**, in five minutes, in Apple's own Shortcuts
  app, does the one thing only it can do: call **Send Message** under your
  own Apple ID.

Read **`docs/APPLE_SHORTCUTS.md`** for the full, honest account of what
Apple actually allows here, what this integration does, and — just as
important — what it deliberately does not claim (there is no delivery or
read confirmation available to any third party, and Advance never pretends
otherwise).

## Stack

Next.js 14 (App Router, TypeScript) + Supabase (Postgres, Auth, Row Level
Security) + Tailwind CSS. Hand-rolled PWA shell (manifest + service worker,
no framework plugin) for full control over the iOS-specific details that
actually matter (safe areas, standalone detection, offline shell). See
`docs/ARCHITECTURE.md`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project + secrets
npm run dev
```

Then follow `docs/DEPLOYMENT.md` to provision Supabase (run the three SQL
migrations in `supabase/migrations/`) and deploy — a real HTTPS deployment
is required to test the Shortcut/PWA install flow; `localhost` cannot be
reached from the Shortcuts app on a phone.

## Docs

- `docs/ARCHITECTURE.md` — stack, data model, request flow, directory map.
- `docs/APPLE_SHORTCUTS.md` — the Shortcut integration in full: how it
  works, researched platform limitations, why chunking, honest status
  vocabulary. Mirrored for end users at `/docs/shortcut` (build guide) and
  `/docs/apple-shortcuts-explainer` (plain-language why) in the app itself.
- `docs/COMPLIANCE.md` — consent, opt-out/STOP handling and its real
  limitation, suppression list, rate limits, audit logs.
- `docs/DEPLOYMENT.md` — step-by-step Supabase + hosting setup.

## What's here vs. what needs a real iPhone to finish verifying

Everything in this repo — schema, RLS, API routes, the PWA shell, the full
UI, the token-based Shortcut protocol — is real, working code, not a mock.
Two things can only be verified on an actual deployed HTTPS URL opened on an
actual iPhone, because the platform gives no other way to test them:

1. **The Add to Home Screen / standalone PWA experience** (Safari-only,
   iOS-only behavior).
2. **The Shortcut itself** — it has to be hand-built once inside the
   Shortcuts app (the `.shortcut` file format can only be authored and
   signed by Apple's own app; see `docs/APPLE_SHORTCUTS.md` for why), then
   run against a real deployment's URL.

`docs/DEPLOYMENT.md` ends with the exact verification steps (test mode
send-to-self before anything else) once you've deployed.
