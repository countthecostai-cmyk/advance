'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SHORTCUT_NAME, SHORTCUT_ICLOUD_LINK } from '@/lib/constants'
import { useIsNativeApp } from '@/lib/useIsNativeApp'

export function ShortcutOnboarding({
  configured,
  onConfirm,
}: {
  configured: boolean
  onConfirm: () => Promise<void>
}) {
  const isNative = useIsNativeApp()
  const [confirming, setConfirming] = useState(false)
  // Once it's installed, the step-by-step instructions just clutter the
  // screen forever -- collapse to a single line, with a link to bring the
  // guide back if it's ever needed again (e.g. setting up a second phone).
  const [showSteps, setShowSteps] = useState(!configured)

  if (configured && !showSteps) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">Apple Shortcut</p>
            <p className="mt-0.5 text-xs text-ink-500">{SHORTCUT_NAME} is installed and ready to send.</p>
          </div>
          <Badge tone="success">Installed</Badge>
        </div>
        <button
          className="mt-2 text-xs font-medium text-brand-600"
          onClick={() => setShowSteps(true)}
        >
          Show setup steps again
        </button>
      </Card>
    )
  }

  // Inside the App Store app there's no Safari tab to open and nothing to add
  // to the Home Screen (the app is already there), so those steps only apply
  // to the website.
  const steps: React.ReactNode[] = SHORTCUT_ICLOUD_LINK
    ? [
        isNative
          ? `Tap the button below to add the ${SHORTCUT_NAME} Shortcut. One tap, no manual setup.`
          : `Open this page on your iPhone in Safari, then tap the button below to add the ${SHORTCUT_NAME} Shortcut. One tap, no manual setup.`,
        'Allow the Contacts and Messages permissions when iOS asks.',
        !isNative && (
          <>
            Add Advance to your Home Screen: Share → <strong>Add to Home Screen</strong>.
          </>
        ),
        'Run a Test Mode send to yourself below before messaging anyone else.',
      ]
    : [
        !isNative && 'Open this page on your iPhone in Safari (not another browser).',
        <>
          Build the <strong>{SHORTCUT_NAME}</strong> Shortcut using the exact steps in the{' '}
          <Link href="/docs/shortcut" className="font-semibold text-brand-600">
            build guide
          </Link>
          . It takes about 5 minutes, one time only.
        </>,
        'Allow the Contacts and Messages permissions when iOS asks.',
        !isNative && (
          <>
            Add Advance to your Home Screen: Share → <strong>Add to Home Screen</strong>.
          </>
        ),
        'Run a Test Mode send to yourself below before messaging anyone else.',
      ]
  const visibleSteps = steps.filter(Boolean)

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Apple Shortcut</p>
        {configured ? <Badge tone="success">Installed</Badge> : <Badge tone="warning">Not installed</Badge>}
      </div>

      <ol className="mb-4 flex flex-col gap-3 text-sm text-ink-700">
        {visibleSteps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {!configured && SHORTCUT_ICLOUD_LINK && (
        <a href={SHORTCUT_ICLOUD_LINK} className="mb-3 block">
          <Button fullWidth size="sm">
            Get {SHORTCUT_NAME} Shortcut
          </Button>
        </a>
      )}

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
