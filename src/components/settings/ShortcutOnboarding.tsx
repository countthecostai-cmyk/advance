'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SHORTCUT_NAME } from '@/lib/constants'

export function ShortcutOnboarding({
  configured,
  onConfirm,
}: {
  configured: boolean
  onConfirm: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Apple Shortcut</p>
        {configured ? <Badge tone="success">Installed</Badge> : <Badge tone="warning">Not installed</Badge>}
      </div>

      <ol className="mb-4 flex flex-col gap-3 text-sm text-ink-700">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">1</span>
          <span>Open this page on your iPhone in Safari (not another browser).</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">2</span>
          <span>
            Build the <strong>{SHORTCUT_NAME}</strong> Shortcut using the exact steps in the{' '}
            <Link href="/docs/shortcut" className="font-semibold text-brand-600">
              build guide
            </Link>{' '}
            — takes about 5 minutes, one time only.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">3</span>
          <span>Allow the Contacts and Messages permissions when iOS asks.</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">4</span>
          <span>
            Add Advance to your Home Screen: Share → <strong>Add to Home Screen</strong>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">5</span>
          <span>Run a Test Mode send to yourself below before messaging anyone else.</span>
        </li>
      </ol>

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
