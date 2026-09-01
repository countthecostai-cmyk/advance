# Deployment

Advance is a standard Next.js 14 app plus a Supabase project. No SMS provider,
no separate backend service — two pieces total.

## 1. Create the Supabase project

1. Create a project at supabase.com (or self-host).
2. Run the migrations in order against it:
   ```
   supabase/migrations/0001_init.sql
   supabase/migrations/0002_rls.sql
   supabase/migrations/0003_functions.sql
   ```
   Either via the Supabase SQL editor (paste each file, run in order) or the
   Supabase CLI: `supabase db push` with these files in
   `supabase/migrations/`.
3. In **Authentication → Providers**, email/password is enabled by default —
   that's all this app uses. Decide whether to require email confirmation
   (Authentication → Settings) before shipping to real users.
4. Copy from **Settings → API**: the Project URL, the `anon` public key, and
   the `service_role` secret key.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` (or your host's env var settings) and
fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — from step 1.
- `NEXT_PUBLIC_APP_URL` — the exact public URL this app will be deployed at,
  no trailing slash. This is baked into the Shortcut's callback URLs and the
  public opt-out links embedded in every outgoing message, so get it right
  before real campaigns go out (changing it later doesn't break anything
  in-flight, but old opt-out links keep pointing at the old value).
- `SHORTCUT_TOKEN_SECRET`, `OPT_OUT_TOKEN_SECRET` — generate with
  `openssl rand -hex 32` each. Keep these actually secret; rotating
  `SHORTCUT_TOKEN_SECRET` invalidates every currently-active Shortcut
  session (safe — the user just taps Send again), rotating
  `OPT_OUT_TOKEN_SECRET` invalidates opt-out links already sent out (not
  safe to do casually — anyone who received an old message loses their
  working opt-out link until they're messaged again).
- `NEXT_PUBLIC_SHORTCUT_NAME` — must exactly match the name the user gives
  the Shortcut when they build it (default `Advance Sender`).

## 3. Deploy the Next.js app

Any Next.js host works (Vercel is the path of least resistance — zero
config beyond the environment variables above). Requirements:

- Node.js runtime (not static export — this app has server-side route
  handlers and needs `crypto`).
- HTTPS is required — `shortcuts://` launches and the Shortcut's
  `Get Contents of URL` calls both need a real HTTPS origin; `localhost`
  cannot be reached from the Shortcuts app on a phone at all, so the whole
  send flow can only be tested on a deployed URL, not `next dev` on your
  laptop.

## 4. Verify the PWA installs correctly

On an actual iPhone (this cannot be meaningfully verified in a desktop
browser or simulator — see the note in the top-level README):

1. Open the deployed URL in **Safari** specifically (Add to Home Screen is
   Safari-only on iOS; it does not appear in Chrome/Firefox for iOS).
2. Share → **Add to Home Screen**.
3. Launch from the Home Screen icon and confirm: no Safari chrome
   (standalone mode), content isn't hidden under the notch/home indicator
   (safe-area insets), and sign-in persists after fully closing and
   reopening the app.

## 5. Build and verify the Shortcut

Follow `docs/APPLE_SHORTCUTS.md` / the in-app guide at `/docs/shortcut`,
using this deployment's URL. Then, inside the deployed app:

1. Settings → set your own phone number.
2. Settings → "Send test message to myself" → confirm it actually arrives
   in your Messages app.
3. Only after that succeeds, run a real campaign.

## Operational notes

- `profiles.daily_send_cap`, `max_recipients_per_campaign`, and
  `min_seconds_between_campaigns` are intentionally not editable from the
  UI (see `docs/COMPLIANCE.md`). To raise a specific account's limits,
  update its `profiles` row directly (SQL editor or a support tool you
  build) — this is a deliberate speed bump, not a missing feature.
- `audit_logs` and `messages` are append-only and grow indefinitely; add a
  retention/archival job once volume warrants it (not included — this is a
  single-tenant-scale launch, not a decision to make blind for a product
  that hasn't shipped yet).
