'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// No email, no password, no texted verification code. Just a name and the
// phone number Advance will send from (also doubles as the "send me a test"
// number for Test Mode). The server creates the account behind the scenes
// (see /api/auth/start) — there's no credential to type back in later, so
// this trades "sign back in on a new device" for zero friction getting
// started. That's a deliberate product choice, not an oversight.
export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, phone }),
    })

    setLoading(false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'That phone number doesn’t look right. Use the format +15551234567.')
      return
    }

    router.replace('/home')
    router.refresh()
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-ink-50 px-6 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-auth-glow" aria-hidden />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-3xl text-white shadow-glow">
            💬
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Get started</h1>
          <p className="mt-1.5 text-sm text-ink-400">No email, no password — just you</p>
        </div>

        <div className="rounded-xl2 border border-ink-100 bg-white p-6 shadow-elevated">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input label="Name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input
              label="Your phone number"
              type="tel"
              autoComplete="tel"
              placeholder="+15551234567"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              hint="The number you'll be sending from"
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" fullWidth loading={loading} className="mt-1">
              Continue
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          Using this on a new phone or browser later will start a fresh account — there&apos;s nothing to
          sign back into.
        </p>
      </div>
    </div>
  )
}
