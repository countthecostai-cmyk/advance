export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-900 px-6 text-center text-white safe-top safe-bottom">
      <div className="text-4xl">📡</div>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-ink-300">
        Advance needs a connection to load your contacts and campaigns. Reconnect and reopen the app.
      </p>
    </main>
  )
}
