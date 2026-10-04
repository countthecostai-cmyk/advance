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

export default function ImportContactsBuildGuidePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 safe-top safe-bottom safe-x">
      <h1 className="text-2xl font-bold text-ink-900">Build the &quot;Add to Advance&quot; Shortcut</h1>
      <p className="mt-2 text-sm text-ink-500">
        One-time setup, about 5 minutes, done entirely in Apple&apos;s own Shortcuts app on your iPhone — the same
        reason the Sender Shortcut has to be built this way too (see{' '}
        <a className="font-semibold text-brand-600" href="/docs/apple-shortcuts-explainer">
          why
        </a>
        ). Once it&apos;s built you can run it any time to pick people straight out of your phone&apos;s Contacts
        app and add them to Advance.
      </p>

      <div className="my-5 rounded-xl2 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        First, go to <strong>Advance → Settings → Add from iPhone Contacts</strong> and tap{' '}
        <strong>Get my import link</strong>. Copy it — you&apos;ll paste it into step 7 below. Then open{' '}
        <strong>Shortcuts</strong> → tap <strong>+</strong> to create a new shortcut → rename it (tap the name at
        the top) to exactly <strong>Add to Advance</strong>. Add these actions in order using the search bar at the
        bottom (tap <strong>+ Add Action</strong>).
      </div>

      <ol>
        <Step n={1} title="Select Contacts">
          Add a <Action>Select Contacts</Action> action. Turn on <strong>Select Multiple</strong> so you can pick
          several people at once.
        </Step>
        <Step n={2} title="Set Variable: Contacts">
          Add <Action>Set Variable</Action>, name it <strong>Picked</strong>, value = the result of step 1.
        </Step>
        <Step n={3} title="Make an empty list to fill">
          Add <Action>List</Action> (an empty list), then <Action>Set Variable</Action> named{' '}
          <strong>ToSend</strong> with that empty list as its value.
        </Step>
        <Step n={4} title="Repeat with Each">
          Add <Action>Repeat with Each</Action> over <strong>Picked</strong>. Everything below goes inside this
          loop.
        </Step>
        <Step n={5} title="Read this contact's name and number">
          Inside the loop, add <Action>Get Details of Contacts</Action> on <strong>Repeat Item</strong> twice: once
          for detail <strong>Full Name</strong>, once for detail <strong>Phone Numbers</strong>. If a contact has
          more than one number, add <Action>Get Item from List</Action> set to <strong>First Item</strong> on the
          phone numbers result so you end up with a single number.
        </Step>
        <Step n={6} title="Build a dictionary for this contact">
          Add <Action>Dictionary</Action> with two entries: key <code>name</code> = the Full Name from step 5, key{' '}
          <code>phone</code> = the phone number from step 5. Then add <Action>Add to Variable</Action>, adding this
          dictionary to <strong>ToSend</strong>. End the “Repeat with Each” here.
        </Step>
      </ol>

      <p className="mb-1 mt-6 text-xs font-bold uppercase tracking-wide text-ink-400">Send it to Advance</p>
      <ol>
        <Step n={7} title="Build the request body">
          After the loop, add another <Action>Dictionary</Action> with one entry: key <code>contacts</code>, value ={' '}
          <strong>ToSend</strong> (the list you built).
        </Step>
        <Step n={8} title="Get Contents of URL">
          Add <Action>Get Contents of URL</Action>. URL = paste your personal import link from Settings (looks
          like{' '}
          <code className="mt-1 block rounded bg-ink-900 p-2 text-xs text-white">
            https://your-advance-deployment.com/api/contacts/import-shortcut/…
          </code>
          ). Method: <strong>POST</strong>. Request Body: <strong>JSON</strong>, set to the dictionary from step 7.
        </Step>
        <Step n={9} title="Show the result">
          Add <Action>Get Dictionary from Input</Action> on the result of step 8, then two{' '}
          <Action>Get Dictionary Value</Action> actions for keys <code>imported</code> and <code>updated</code>.
          Add <Action>Show Notification</Action> with text like “Added {'{imported}'}, updated{' '}
          {'{updated}'} contacts.” Done — save the Shortcut.
        </Step>
      </ol>

      <div className="mt-6 rounded-xl2 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Go back to Advance → Settings → tap <strong>“I&apos;ve built the Shortcut”</strong>. From then on, run{' '}
        <strong>Add to Advance</strong> from the Shortcuts app (or add it to your Home Screen / Share Sheet)
        whenever you want to add people — pick them, and they show up in Advance&apos;s Contacts list within
        seconds.
      </div>

      <div className="mt-4 rounded-xl2 border border-ink-200 bg-ink-50 p-4 text-xs text-ink-500">
        Your import link only lets contacts be <em>added</em> — it can&apos;t read, message, or delete anything.
        Even so, treat it like a password: don&apos;t paste it anywhere other than this one Shortcut. If you ever
        think it leaked, get a new one from Settings — the old link stops working immediately.
      </div>
    </div>
  )
}
