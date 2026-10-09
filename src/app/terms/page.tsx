export const metadata = { title: 'Terms of Use' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-ink-900">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink-600">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 safe-top safe-bottom safe-x">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Terms of Use</h1>
      <p className="mb-6 text-xs text-ink-400">Last updated October 2026</p>

      <Section title="Using Advance">
        <p>
          Advance helps you organize contacts, groups, and events, and send text messages from your own iPhone
          number via Apple&apos;s Messages app. Messages are sent by you, from your own device and phone number —
          Advance never sends a message on your behalf from its own servers.
        </p>
      </Section>

      <Section title="Your responsibility when texting people">
        <ul className="ml-4 list-disc">
          <li>Only message people who&apos;ve agreed to hear from you.</li>
          <li>Honor opt-outs immediately — Advance tracks STOP replies automatically.</li>
          <li>Don&apos;t use Advance to send spam, scams, or anything illegal or harassing.</li>
          <li>You&apos;re responsible for complying with texting laws that apply where you and your recipients are.</li>
        </ul>
      </Section>

      <Section title="Account">
        <p>
          Your account is tied to this device/browser session — there&apos;s no separate password to manage.
          Keep access to your device secure, since anyone with it can use your account.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          Advance is provided as-is. We work to keep it reliable, but we can&apos;t guarantee every message always
          sends successfully — Apple&apos;s Messages app, your cellular connection, and your recipient&apos;s phone
          all have to cooperate too.
        </p>
      </Section>

      <Section title="Changes">
        <p>We may update these terms as Advance grows. We&apos;ll post changes here.</p>
      </Section>

      <Section title="Contact">
        <p>
          Questions? Email{' '}
          <a className="font-semibold text-brand-600" href="mailto:countthecostai@gmail.com">
            countthecostai@gmail.com
          </a>
          .
        </p>
      </Section>
    </div>
  )
}
