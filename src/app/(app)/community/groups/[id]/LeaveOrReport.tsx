'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const SUPPORT_EMAIL = 'countthecostai@gmail.com'

// "Leave" and "Report a concern" for anyone in a group, so people can get
// out of a group and flag a name, event or group that's abusive or
// inappropriate (App Store Review Guideline 1.2).
export function LeaveOrReport({
  groupId,
  groupName,
  isMember,
  leaveLabel,
}: {
  groupId: string
  groupName: string
  isMember: boolean
  leaveLabel: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function leave() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/community/groups/${groupId}/leave`, { method: 'POST' })
    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Something went wrong. Please try again.')
      return
    }
    router.push('/community')
    router.refresh()
  }

  const reportHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Report a concern: ${groupName}`,
  )}&body=${encodeURIComponent(
    `Group: ${groupName}\nGroup ID: ${groupId}\n\nWhat's the problem? (Who or what, and what happened)\n\n`,
  )}`

  return (
    <div className="mb-6 flex flex-col gap-2 border-t border-ink-100 pt-4">
      {isMember &&
        (confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink-600">
              Leave {groupName}? You&apos;ll stop seeing its members and events. You can rejoin with an invite.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" loading={loading} onClick={leave}>
                {leaveLabel}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
            {leaveLabel}
          </Button>
        ))}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <a href={reportHref} className="text-xs font-medium text-ink-400 underline">
        Report a concern about this group
      </a>
    </div>
  )
}
