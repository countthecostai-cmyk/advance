import Link from 'next/link'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base font-semibold text-ink-900">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink-600">{children}</div>
    </section>
  )
}

export default function AppleShortcutsExplainerPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 safe-top safe-bottom safe-x">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">How sending actually works</h1>
      <p className="mb-6 text-sm text-ink-500">
        The honest technical account — what Apple allows, what Advance does, and where we stopped rather than fake
        it. The full engineering version lives in this project&apos;s <code>docs/APPLE_SHORTCUTS.md</code>.
      </p>

      <Section title="Why a Shortcut at all">
        <p>
          There is no public API that lets a website or server send an iMessage/SMS as your personal iPhone
          number. The only Apple-supported way is the Shortcuts app&apos;s own <strong>Send Message</strong>{' '}
          action, run on your phone, under your Apple ID. Advance prepares everything (who, what, in what order) and
          then hands it to a Shortcut you build once — Advance itself never touches your Messages account.
        </p>
      </Section>

      <Section title="What Advance can never tell you">
        <p>
          Apple does not expose delivery or read receipts to any third-party app or Shortcut — not to Advance, and
          not to any other product built this way. Once a message is “handed to Apple Messages,” Advance
          has no way to know if it was delivered, read, or bounced. We show exactly four states — Prepared, Handed
          to Apple Messages, Failed, Unknown/Skipped — and nothing stronger than that, anywhere in the app.
        </p>
      </Section>

      <Section title="Why large campaigns take a few taps, not zero">
        <p>
          Apple gives no way to run a Shortcut silently and unattended in the background at a time of an app&apos;s
          choosing. Advance sends in batches (20 recipients by default) and shows “Continue in Apple
          Messages” between batches. This is also what makes Pause and Stop work: a batch boundary is the only
          place Advance can reliably regain control.
        </p>
      </Section>

      <Section title="What we deliberately did not build">
        <p>
          No Twilio or virtual phone number for the main workflow. No jailbreak tricks, private APIs, or
          accessibility automation to click through Messages&apos; UI for you. No suppression of iOS&apos;s own
          confirmation prompts. If Apple asks you to confirm something, you&apos;ll see that prompt.
        </p>
      </Section>

      <Link href="/docs/shortcut" className="font-semibold text-brand-600">
        ← Back to the build guide
      </Link>
    </div>
  )
}
