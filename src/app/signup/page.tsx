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
      options: { data: { display_name: displayName || undefined } },
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center safe-top safe-bottom">
        <div className="text-4xl">📬</div>
        <h1 className="text-xl font-semibold text-ink-900">Check your email</h1>
        <p className="max-w-xs text-sm text-ink-400">
          We sent a confirmation link to {email}. Tap it, then come back and sign in.
        </p>
        <Link href="/login" className="mt-2 text-sm font-semibold text-brand-600">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl text-white">
            💬
          </div>
          <h1 className="text-2xl font-bold text-ink-900">Create your account</h1>
          <p className="mt-1 text-sm text-ink-400">Your campaigns, contacts, and history are yours alone</p>
        </div>

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
          <Button type="submit" fullWidth loading={loading}>
            Create account
          </Button>
        </form>

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
