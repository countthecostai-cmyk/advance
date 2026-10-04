'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function ContactsImportCard({
  configured,
  onConfirm,
}: {
  configured: boolean
  onConfirm: () => Promise<void>
}) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getLink() {
    setLoading(true)
    setError(null)
    setCopied(false)
    const res = await fetch('/api/contacts/import-token', { method: 'POST' })
    setLoading(false)
    if (!res.ok) {
      setError('Could not create a link. Try again.')
      return
    }
    const data = await res.json()
    setLink(data.import_url)
  }

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Clipboard API can be unavailable (e.g. no HTTPS focus) — the link
      // text is already shown on screen to copy manually either way.
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Add from iPhone Contacts</p>
        {configured ? <Badge tone="success">Installed</Badge> : <Badge tone="warning">Not installed</Badge>}
      </div>
      <p className="mb-3 text-xs text-ink-500">
        A one-time Apple Shortcut that lets you pick any number of people straight from your iPhone&apos;s Contacts
        app and add them to Advance — no typing numbers by hand.
      </p>

      <ol className="mb-4 flex flex-col gap-3 text-sm text-ink-700">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            1
          </span>
          <span>
            Tap <strong>Get my import link</strong> below and copy it.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            2
          </span>
          <span>
            Build the <strong>Add to Advance</strong> Shortcut using the{' '}
            <Link href="/docs/import-contacts" className="font-semibold text-brand-600">
              build guide
            </Link>{' '}
            — paste your link into it where shown. About 5 minutes, one time only.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            3
          </span>
          <span>Run it anytime from your Home Screen or Share Sheet: pick contacts, and they show up in Advance.</span>
        </li>
      </ol>

      {!link ? (
        <Button fullWidth size="sm" onClick={getLink} loading={loading}>
          {configured ? 'Get a new import link' : 'Get my import link'}
        </Button>
      ) : (
        <div className="mb-3 flex flex-col gap-2">
          <div className="break-all rounded-lg border border-ink-100 bg-ink-50 p-2 text-xs text-ink-700">{link}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
            <Button size="sm" variant="secondary" onClick={getLink} loading={loading}>
              Get a new link
            </Button>
          </div>
          <p className="text-xs text-ink-400">
            Keep this link private — anyone who has it could add contacts to your account. Get a new link any time
            you think it leaked; the old one stops working immediately.
          </p>
        </div>
      )}

      {error && <p className="mb-2 text-xs font-medium text-red-600">{error}</p>}

      {!configured && (
        <Button
          fullWidth
          size="sm"
          variant="secondary"
          loading={confirming}
          onClick={async () => {
            setConfirming(true)
            await onConfirm()
            setConfirming(false)
          }}
        >
          I&apos;ve built the Shortcut
        </Button>
      )}
    </Card>
  )
}
