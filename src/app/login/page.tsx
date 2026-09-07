'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const confirmFailed = params.get('error') === 'confirmation_failed'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.replace(params.get('next') || '/home')
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
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-ink-400">Sign in to manage your campaigns</p>
        </div>

        <div className="rounded-xl2 border border-ink-100 bg-white p-6 shadow-elevated">
          {confirmFailed && (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700">
              That confirmation link didn&apos;t work — it may have expired. Try signing in, or sign up again.
            </p>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" fullWidth loading={loading} className="mt-1">
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-400">
          No account?{' '}
          <Link href="/signup" className="font-semibold text-brand-600">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
