'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// No form. No name, no phone number, no email, no password — landing here
// IS signing up. An account is created the instant the page loads and the
// person is dropped straight into the app. A name and sending number can be
// added later from Settings (needed there before Sending with Apple
// Messages actually works, but not before someone can look around).
export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function start() {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Something went wrong getting you set up.')
        return
      }

      router.replace('/home')
      router.refresh()
    }

    start()
  }, [router])

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-ink-50 px-6 text-center safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-auth-glow" aria-hidden />

      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-3xl text-white shadow-glow">
          💬
        </div>

        {error ? (
          <>
            <p className="max-w-xs text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-semibold text-brand-600"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
            <p className="text-sm text-ink-400">Getting you set up…</p>
          </>
        )}
      </div>
    </div>
  )
}
