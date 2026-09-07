'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

const OPTIONS: { value: 'going' | 'maybe' | 'not_going'; label: string }[] = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'not_going', label: "Can't Go" },
]

export function RsvpButtons({ eventId, currentStatus }: { eventId: string; currentStatus?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function setStatus(status: string) {
    setPending(true)
    await fetch(`/api/community/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          disabled={pending}
          onClick={() => setStatus(opt.value)}
          className={clsx(
            'tap-target flex-1 rounded-xl border px-3 text-sm font-semibold transition disabled:opacity-50',
            currentStatus === opt.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 bg-white text-ink-900'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
