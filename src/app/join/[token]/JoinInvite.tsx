'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function JoinInvite({ token, signedIn, groupNoun }: { token: string; signedIn: boolean; groupNoun: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!signedIn && !name.trim()) {
      setError('Add your name so your leader knows who joined.')
      return
    }
    setLoading(true)
    try {
      if (!signedIn) {
        const start = await fetch('/api/auth/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_name: name.trim() }),
        })
        if (!start.ok) throw new Error((await start.json().catch(() => ({}))).error || 'Could not create your account')
      }
      const res = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not join')
      router.replace(body.group_id ? `/community/groups/${body.group_id}` : '/community')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={join} className="flex flex-col gap-3">
      {!signedIn && (
        <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} />
      )}
      <Button type="submit" fullWidth loading={loading}>
        Join {groupNoun}
      </Button>
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <p className="text-center text-xs text-ink-400">
        No password needed. You&apos;ll see upcoming events and can RSVP right away.
      </p>
    </form>
  )
}
