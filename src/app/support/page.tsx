export const metadata = { title: 'Support' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-ink-900">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink-600">{children}</div>
    </section>
  )
}

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 safe-top safe-bottom safe-x">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Support</h1>
      <p className="mb-6 text-xs text-ink-400">Advance — help &amp; contact</p>

      <Section title="Need help?">
        <p>
          Email{' '}
          <a className="font-semibold text-brand-600" href="mailto:countthecostai@gmail.com">
            countthecostai@gmail.com
          </a>{' '}
          and we&apos;ll get back to you as soon as we can.
        </p>
      </Section>

      <Section title="Connecting your Contacts">
        <p>
          Inside the app, go to Settings and tap &quot;Connect my Contacts.&quot; Advance will ask for permission to
          read your iPhone&apos;s Contacts — only the name and phone number of people you choose to message are ever
          sent to Advance.
        </p>
      </Section>

      <Section title="Opting out of texts">
        <p>
          Anyone who receives a text from Advance can reply STOP at any time to opt out. Advance keeps track of this
          automatically and will not message that number again.
        </p>
      </Section>

      <Section title="Deleting your account">
        <p>
          In the app, go to Settings and tap &quot;Delete my account.&quot; This permanently erases your account and
          everything in it right away. If you have any trouble, email{' '}
          <a className="font-semibold text-brand-600" href="mailto:countthecostai@gmail.com">
            countthecostai@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section title="Privacy Policy">
        <p>
          Read our{' '}
          <a className="font-semibold text-brand-600" href="/privacy">
            Privacy Policy
          </a>{' '}
          for details on what we collect and how it&apos;s used.
        </p>
      </Section>
    </div>
  )
}
