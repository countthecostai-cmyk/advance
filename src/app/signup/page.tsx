'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || undefined },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data.session) {
      router.replace('/home')
      router.refresh()
    } else {
      // Email confirmation is enabled on the Supabase project.
      setCheckEmail(true)
    }
  }

  if (checkEmail) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 overflow-hidden bg-ink-50 px-6 text-center safe-top safe-bottom">
        <div className="pointer-events-none absolute inset-0 bg-auth-glow" aria-hidden />
        <div className="relative flex flex-col items-center gap-3 rounded-xl2 border border-ink-100 bg-white p-8 shadow-elevated">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-3xl shadow-glow">
            📬
          </div>
          <h1 className="text-xl font-semibold text-ink-900">Check your email</h1>
          <p className="max-w-xs text-sm text-ink-400">
            We sent a confirmation link to <span className="font-medium text-ink-700">{email}</span>. Tap it, then
            come back and sign in.
          </p>
          <Link href="/login" className="mt-2 text-sm font-semibold text-brand-600">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-ink-50 px-6 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-auth-glow" aria-hidden />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-3xl text-white shadow-glow">
            💬
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Create your account</h1>
          <p className="mt-1.5 text-sm text-ink-400">Your campaigns, contacts, and history are yours alone</p>
        </div>

        <div className="rounded-xl2 border border-ink-100 bg-white p-6 shadow-elevated">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input label="Name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="At least 8 characters"
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" fullWidth loading={loading} className="mt-1">
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
