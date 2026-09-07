'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

const OPTIONS: { value: 'present' | 'absent' | 'excused'; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
]

export function AttendanceRow({
  eventId,
  userId,
  name,
  currentStatus,
}: {
  eventId: string
  userId: string
  name: string
  currentStatus?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function setStatus(status: string) {
    setPending(true)
    await fetch(`/api/community/events/${eventId}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, status }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-ink-900">{name}</span>
      <div className="flex gap-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            disabled={pending}
            onClick={() => setStatus(opt.value)}
            className={clsx(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-50',
              currentStatus === opt.value ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
