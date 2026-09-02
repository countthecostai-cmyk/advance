import { SHORTCUT_NAME } from '@/lib/constants'

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 border-b border-ink-100 py-4 last:border-0">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold text-ink-900">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-ink-600">{children}</div>
      </div>
    </li>
  )
}

function Action({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[13px] font-medium text-ink-800">{children}</code>
}

export default function ShortcutBuildGuidePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-advance-deployment.com'

  return (
    <div className="mx-auto max-w-lg px-4 py-8 safe-top safe-bottom safe-x">
      <h1 className="text-2xl font-bold text-ink-900">Build the {SHORTCUT_NAME} Shortcut</h1>
      <p className="mt-2 text-sm text-ink-500">
        One-time setup, about 5 minutes, done entirely in Apple&apos;s own Shortcuts app on your iPhone. Advance can&apos;t
        install this for you — the <code>.shortcut</code> file format can only be created and signed by the
        Shortcuts app itself. See <a className="font-semibold text-brand-600" href="/docs/apple-shortcuts-explainer">why, and what Apple actually allows</a>.
      </p>

      <div className="my-5 rounded-xl2 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Open <strong>Shortcuts</strong> → tap <strong>+</strong> to create a new shortcut → rename it (tap the name
        at the top) to exactly <strong>{SHORTCUT_NAME}</strong>. Then add these actions in order using the search
        bar at the bottom (tap <strong>+ Add Action</strong>).
      </div>

      <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wide text-ink-400">Part 1 — Fetch what to send</p>
      <ol>
        <Step n={1} title="Text">
          Add a <Action>Text</Action> action. Set its content to:
          <br />
          <code className="mt-1 block rounded bg-ink-900 p-2 text-xs text-white">
            {appUrl}/api/shortcut/
          </code>
          Then tap right after it and insert the <strong>Shortcut Input</strong> variable (tap the little variable
          picker, or type <code>{'{{'}</code> style insertion) so the text reads
          the URL immediately followed by the input value with no space.
        </Step>
        <Step n={2} title="Get Contents of URL">
          Add <Action>Get Contents of URL</Action>. Set the URL to the <strong>Text</strong> from step 1. Method:{' '}
          <strong>GET</strong>.
        </Step>
        <Step n={3} title="Get Dictionary from Input">
          Add <Action>Get Dictionary from Input</Action>, fed by the result of step 2. This parses the JSON
          response into a usable dictionary.
        </Step>
        <Step n={4} title="Set Variable: Batch">
          Add <Action>Set Variable</Action>, name it <strong>Batch</strong>, value = the dictionary from step 3.
        </Step>
        <Step n={5} title="If nothing to send, stop">
          Add <Action>Get Dictionary Value</Action> for key <code>recipients</code> from <strong>Batch</strong>.
          Wrap the rest of the shortcut in an <Action>If</Action>: “Count” of that list is greater than 0.
          In the <strong>Otherwise</strong> branch, add <Action>Show Notification</Action> (“Nothing to
          send”) then <Action>Stop This Shortcut</Action>.
        </Step>
        <Step n={6} title="Set Variable: ShouldContinue">
          Inside the “If” branch, add <Action>Set Variable</Action> named <strong>ShouldContinue</strong>,
          value <strong>true</strong> (a boolean, not text).
        </Step>
      </ol>

      <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wide text-ink-400">Part 2 — Send each message</p>
      <ol>
        <Step n={7} title="Repeat with Each">
          Add <Action>Repeat with Each</Action> over the <code>recipients</code> list from step 5. Everything below
          goes inside this loop.
        </Step>
        <Step n={8} title="Guard on ShouldContinue">
          Add an <Action>If</Action>: <strong>ShouldContinue</strong> is <strong>true</strong>. Everything else in
          this section goes inside this If’s first branch — this is what lets Pause/Stop in the app take
          effect between sends, since there’s no way to interrupt a running Shortcut from outside it.
        </Step>
        <Step n={9} title="Read this recipient's fields">
          Add three <Action>Get Dictionary Value</Action> actions on <strong>Repeat Item</strong>, for keys{' '}
          <code>phone_number</code>, <code>message</code>, and <code>recipient_id</code>.
        </Step>
        <Step n={10} title="Send Message">
          Add <Action>Send Message</Action>. Recipients = the <code>phone_number</code> value. Message = the{' '}
          <code>message</code> value. Turn off “Show When Run” if you don’t want to see the compose
          screen for every send — test this once in Test Mode first, since whether iOS still prompts you can vary
          by iOS version and Advance can’t control or predict it.
        </Step>
        <Step n={11} title="Wait (pacing)">
          Add <Action>Get Dictionary Value</Action> for key <code>rate_limit_seconds</code> from{' '}
          <strong>Batch</strong>, then a <Action>Wait</Action> action for that many seconds. This is advisory
          pacing, not something Apple enforces — it just avoids sending faster than a real person tapping Send
          would.
        </Step>
        <Step n={12} title="Report progress">
          Add <Action>Get Dictionary Value</Action> for key <code>progress_url</code> from <strong>Batch</strong>.
          Add <Action>Get Contents of URL</Action>: URL = <code>progress_url</code>, Method <strong>POST</strong>,
          Request Body → JSON, with fields <code>recipient_id</code> (the value from step 9) and{' '}
          <code>result</code> = the text <code>handed_to_messages</code>.
        </Step>
        <Step n={13} title="Check whether to keep going">
          Add <Action>Get Dictionary from Input</Action> on the result of step 12, then{' '}
          <Action>Get Dictionary Value</Action> for key <code>continue</code>. Add{' '}
          <Action>Set Variable</Action> to overwrite <strong>ShouldContinue</strong> with that value. (End the two
          “If” blocks from steps 5 and 8 here.)
        </Step>
      </ol>

      <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wide text-ink-400">Part 3 — Wrap up</p>
      <ol>
        <Step n={14} title="Get Dictionary Value: complete_url">
          After the <strong>Repeat with Each</strong> ends, add <Action>Get Dictionary Value</Action> for key{' '}
          <code>complete_url</code> from <strong>Batch</strong>.
        </Step>
        <Step n={15} title="Report completion">
          Add <Action>Get Contents of URL</Action>: URL = <code>complete_url</code>, Method <strong>POST</strong>,
          JSON body with field <code>reason</code> = text <code>finished</code>.
        </Step>
        <Step n={16} title="Show Notification">
          Add <Action>Show Notification</Action>, text “Advance: sent this batch.” Done — save the
          Shortcut.
        </Step>
      </ol>

      <div className="mt-6 rounded-xl2 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Go back to Advance → Settings → tap <strong>“I’ve built the Shortcut”</strong> → run a{' '}
        <strong>Test Mode</strong> campaign to yourself before sending anything real.
      </div>
    </div>
  )
}
