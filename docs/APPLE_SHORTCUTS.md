# The Apple Shortcuts integration: how it works, and its real limits

This document is the honest technical account of how Advance hands messages off
to Apple Messages, what iOS actually lets a third-party web app do here, and
where we deliberately stopped rather than invent a workaround. It's written
for both engineers maintaining this code and for the curious end user.

## What Apple does and doesn't let us do

Researched against Apple's current Shortcuts documentation and developer/user
reports (August 2026):

- **A website — including one running as a standalone Home Screen PWA — can
  open the Shortcuts app and pass it text input**, via the public
  `shortcuts://` URL scheme: `shortcuts://run-shortcut?name=<name>&input=text&text=<value>`.
  This is documented, supported, and exactly what Advance uses. ([Apple: Run a
  shortcut from a URL](https://support.apple.com/guide/shortcuts/run-a-shortcut-from-a-url-apd624386f42/ios))
- **A Shortcut can send an iMessage/SMS through the user's own Messages
  account** using the built-in "Send Message" action. This is the *only*
  legitimate way for a third-party tool to make the user's own iPhone number
  send a text — there is no public API that lets a website or backend server
  send as the user's personal number. Community reports confirm this pattern
  scales to real bulk use (one Apple Support Communities thread describes
  looping "Send Message" over 300+ contacts successfully). ([Apple Support
  Communities](https://discussions.apple.com/thread/256119828))
- **Results can flow back to the calling app via `x-callback-url`**
  (`x-success`, `x-cancel`, `x-error` parameters), but Apple's own
  documentation does not specify how — or whether reliably — this reopens a
  *Home Screen web app* specifically (as opposed to a native app with a
  registered URL scheme). In practice this is inconsistent: tapping an
  `x-success` https link can open Safari instead of relaunching the
  installed standalone PWA. **Advance does not depend on this working.**
  Progress is reported over an authenticated HTTPS callback the Shortcut
  calls directly (see below), and the user simply reopens Advance from their
  Home Screen to see current status — which always works.
- **There is no public API for delivery or read receipts.** Apple does not
  expose whether an iMessage/SMS was delivered, read, or bounced to any
  third-party app or Shortcut. The "Send Message" action reports only
  whether the action itself completed without error. **Advance never claims
  more than that** — see "Honest status" below.
- **Whether "Send Message" shows a confirmation UI when the Shortcut is run
  manually (not as a background automation) is not documented and appears to
  vary by iOS version and whether "Show When Run" is enabled on the action.**
  Automations *triggered by* a received message have historically required
  manual confirmation with no way to disable it; running a shortcut yourself
  (including via a `shortcuts://` URL, which is a foreground, user-initiated
  run) is a different code path and generally does not force that prompt,
  but Apple could change this at any time. **This is why Test Mode exists
  and why onboarding tells you to test it yourself before a real campaign.**
- **There is no documented per-run recipient limit**, but real-world reports
  describe occasional undocumented friction in the high tens of contacts in
  a single run (one user hit an error mentioning a 19-contact restriction).
  Advance defaults to a **chunk size of 20 recipients per Shortcut run** for
  exactly this reason — see "Why chunking" below.

## What Advance deliberately does NOT do

- **No private/undocumented APIs.** Every action used in the Shortcut recipe
  (`docs/APPLE_SHORTCUTS.md` build guide, mirrored at `/docs/shortcut` in the
  app) is a stock, documented Shortcuts action available in the Shortcuts
  app's own action library.
- **No jailbreak, accessibility-hack, or UI-automation tricks.** Nothing
  drives the Messages app's UI programmatically; "Send Message" is Apple's
  own supported action for this.
- **No bypass of confirmation prompts.** If iOS shows a permission or
  confirmation prompt, the user sees and answers it. Advance cannot and does
  not try to suppress it.
- **No third-party sending number.** No Twilio, no virtual number, no
  "SMS gateway." Every message physically originates from the Messages app
  on the user's own iPhone, under the user's own Apple ID / phone number.

## Why chunking, not one giant fetch

The Shortcut fetches recipients from `GET /api/shortcut/:token`, which
returns **up to `campaign.chunk_size` pending recipients at a time**
(default 20), not the whole campaign. Reasons:

1. **Reliability.** Reports of Shortcuts misbehaving on longer in-memory
   lists (see the 19-contact anecdote above) make smaller, resumable batches
   the safer default.
2. **Pause/Stop actually work.** A running Shortcut can't be reached from
   outside — there's no push channel into a live Shortcuts execution. What
   *can* happen: the Shortcut calls `POST /api/shortcut/:token/progress`
   after every single send, and the JSON response includes `continue: false`
   the moment the campaign has been paused or stopped from the app. The
   Shortcut recipe wraps every send in an `If` check on a `ShouldContinue`
   variable so it stops acting within seconds of a Pause tap — not
   instantly (whatever send is already in flight for that iteration
   finishes), but within one iteration, not one whole campaign.
3. **A campaign larger than one chunk is not "automatic background bulk
   sending."** After a chunk finishes, Advance shows **"Continue in Apple
   Messages (N left)"** — tapping it launches the Shortcut again for the
   next chunk. This is intentional: Apple gives no way to run a Shortcut
   unattended and silently in the background at will, and Advance does not
   pretend otherwise. Large campaigns take a small number of taps, not zero.

## The full data flow

1. User builds a campaign in the PWA (recipients, message, personalization
   all resolved and stored server-side as `campaign_recipients` rows, one
   per contact, with the final personalized text already rendered).
2. User taps **"Send with Apple Messages"** and confirms
   ("Send 87 messages through Apple Messages?").
3. `POST /api/campaigns/:id/start` runs abuse-prevention checks (daily cap,
   per-campaign recipient cap, cooldown since the last campaign), creates a
   `shortcut_sessions` row with a signed, single-use, expiring token, and
   returns a `shortcuts://x-callback-url/run-shortcut?...&text=<token>` URL.
4. The PWA navigates to that URL. iOS switches to the Shortcuts app and runs
   the named Shortcut, passing the token in as its Shortcut Input.
5. The Shortcut's first action does `GET /api/shortcut/<token>` — this is
   the "supported mechanism" for getting recipient data into the Shortcut
   (plain authenticated HTTPS, not URL query parameters, so there's no
   practical size limit on the message text or recipient count per chunk).
   The response contains up to `chunk_size` recipients (id, phone number,
   already-personalized message text), the advisory pacing delay, and the
   exact `progress_url` / `complete_url` to call next.
6. The Shortcut loops the recipients with **Repeat with Each**, calling
   **Send Message** for each, then reporting the outcome to `progress_url`
   and checking the `continue` flag before the next iteration.
7. When the loop ends (chunk exhausted, or told to stop), the Shortcut calls
   `complete_url`, which recomputes the campaign's rollup counters and flips
   its status to `completed` once every recipient has reached a terminal
   state.
8. The user reopens Advance (from the Home Screen, or `x-success` if that
   happens to work on their device/iOS version) and sees live, accurate
   progress — pulled from the database Advance itself wrote as the Shortcut
   called back, not inferred or guessed.

## Honest status vocabulary (see also the in-app compliance banner)

Advance uses exactly these four states end to end, and never implies more:

| Status | Meaning |
|---|---|
| **Prepared** | Personalized message is generated and queued in Advance. Nothing has reached the phone's Messages app yet. |
| **Handed to Apple Messages** | The Shortcut's Send Message action ran for this recipient with no reported error. This is the *ceiling* of what Advance can ever claim — Apple gives no delivery or read confirmation to any third party. |
| **Failed** | The Send Message action itself reported an error (e.g. invalid recipient), reported by the Shortcut. |
| **Unknown / Skipped** | Recipient was excluded before sending (opted out, suppressed, invalid number) or a run was interrupted before Advance heard back at all. |

There is no "Delivered" or "Read" status anywhere in this product, and there
never should be — building one would mean fabricating information Apple does
not provide.

## Rebuilding the Shortcut file itself

**Advance cannot generate an installable `.shortcut` file for you.** The
`.shortcut` format is a signed binary property list that only Apple's own
Shortcuts app can author and sign; there is no public, unsigned way to
hand-produce one outside the app (and this sandbox has no iPhone to build
and export one on). This is the one piece of this system a person has to
build themselves, once, directly in the Shortcuts app — using the exact,
numbered action list in the in-app guide at **Settings → Apple Shortcut →
build guide** (`/docs/shortcut`). It takes about five minutes and never
needs to be touched again unless this document's action list changes.
