'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TERMINOLOGY, VERTICAL_ORDER } from '@/lib/terminology'
import type { Vertical } from '@/lib/types/database.types'

export default function CommunityOnboardingPage() {
  const router = useRouter()
  const [vertical, setVertical] = useState<Vertical>('church')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const t = TERMINOLOGY[vertical]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/community/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, vertical }),
    })
    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Could not set this up')
      return
    }
    router.replace('/community')
    router.refresh()
  }

  return (
    <div className="px-4 pt-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Let&apos;s set up your organization</h1>
        <p className="mt-1 text-sm text-ink-400">
          You&apos;ll be the admin. You can add {t.leaderNounPlural.toLowerCase()} and {t.groupNounPlural.toLowerCase()} next.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">What kind of organization is this?</p>
          <div className="flex flex-col gap-2">
            {VERTICAL_ORDER.map((v) => (
              <label
                key={v}
                className={`tap-target flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  vertical === v ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="vertical"
                  value={v}
                  checked={vertical === v}
                  onChange={() => setVertical(v)}
                  className="accent-brand-500"
                />
                <span className="font-medium text-ink-900">{TERMINOLOGY[v].label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input
          label={`${t.orgNoun} name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={vertical === 'church' ? 'Grace Community Church' : `Your ${t.orgNoun.toLowerCase()}'s name`}
          required
        />

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <Button type="submit" fullWidth loading={loading}>
          Continue
        </Button>
      </form>
    </div>
  )
}
