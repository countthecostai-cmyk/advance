'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function InviteCard({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getLink(): Promise<string | null> {
    if (url) return url
    setLoading(true)
    setError(null)
    const res = await fetch('/api/community/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId }),
    })
    const body = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(body.error || 'Could not create an invite link')
      return null
    }
    setUrl(body.url)
    return body.url as string
  }

  async function share() {
    const link = await getLink()
    if (!link) return
    const text = `Join ${groupName} on Advance: ${link}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Join ${groupName}`, text, url: link })
        return
      } catch {
        // cancelled or unsupported — fall through to copy
      }
    }
    await copy(link)
  }

  async function copy(link?: string) {
    const value = link ?? (await getLink())
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Copy didn’t work — press and hold the link below to copy it.')
    }
  }

  return (
    <Card className="mb-4">
      <p className="mono-label mb-2 text-[10.5px] text-brand-600">Invite people</p>
      <p className="mb-3 text-sm text-ink-600">
        Send this link to anyone you want in {groupName}. They tap it, add their name, and they&apos;re in — no password.
      </p>
      <div className="flex gap-2">
        <Button size="sm" fullWidth onClick={share} loading={loading}>
          Share invite
        </Button>
        <Button size="sm" variant="secondary" fullWidth onClick={() => copy()} disabled={loading}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      {url && <p className="mt-3 break-all text-xs text-ink-400 select-all">{url}</p>}
      {error && <p className="mt-2 text-xs text-brand-600">{error}</p>}
    </Card>
  )
}
