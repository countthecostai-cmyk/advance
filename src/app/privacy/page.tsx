export const metadata = { title: 'Privacy Policy' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-ink-900">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink-600">{children}</div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 safe-top safe-bottom safe-x">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Privacy Policy</h1>
      <p className="mb-6 text-xs text-ink-400">Last updated October 2026</p>

      <Section title="What Advance is">
        <p>
          Advance is a tool for group leaders — pastors, Life Group leaders, and similar — to manage contacts,
          events, and group messages, and to send text updates from their own iPhone number using Apple&apos;s own
          Messages app.
        </p>
      </Section>

      <Section title="What we collect">
        <p>When you use Advance, we store:</p>
        <ul className="ml-4 list-disc">
          <li>Contact info you add yourself: names and phone numbers of the people you message.</li>
          <li>Your own profile info: a display name, your own phone number (for test sends), and your timezone.</li>
          <li>Messages, campaigns, groups, and events you create inside Advance.</li>
          <li>Basic activity logs (for example, when a campaign was sent) so you can see your own history.</li>
        </ul>
        <p>
          We do not read, store, or have access to the actual contents of text messages sent from your iPhone —
          those are sent directly by Apple&apos;s Messages app on your device, not through our servers.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          Solely to run the app for you: showing your contacts and groups, building the list of who a campaign
          should go to, and remembering your settings. We don&apos;t sell your data, and we don&apos;t use it for
          advertising.
        </p>
      </Section>

      <Section title="Where it's stored">
        <p>
          Your data is stored with Supabase, a hosted database provider, protected so that only your own account
          can see your own contacts and messages.
        </p>
      </Section>

      <Section title="Contacts you add">
        <p>
          Advance lets you add contacts from your iPhone&apos;s Contacts app (either by picking them inside the app,
          or by sharing one straight from the Contacts app). Only the name and phone number of people you choose to
          add are sent to Advance — nothing else on your phone is read or accessed.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className="ml-4 list-disc">
          <li>You can remove any contact from Advance at any time.</li>
          <li>Anyone you text can reply STOP to opt out, which Advance keeps track of automatically.</li>
          <li>You can sign out at any time, which ends your session on that device.</li>
          <li>
            To delete your account and all associated data, email{' '}
            <a className="font-semibold text-brand-600" href="mailto:countthecostai@gmail.com">
              countthecostai@gmail.com
            </a>{' '}
            and we&apos;ll remove it.
          </li>
        </ul>
      </Section>

      <Section title="Questions">
        <p>
          Reach out any time at{' '}
          <a className="font-semibold text-brand-600" href="mailto:countthecostai@gmail.com">
            countthecostai@gmail.com
          </a>
          .
        </p>
      </Section>
    </div>
  )
}
