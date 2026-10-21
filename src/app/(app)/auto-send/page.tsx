'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SHORTCUT_NAME } from '@/lib/constants'

function ago(iso: string | null) {
  if (!iso) return null
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  return `${Math.round(hrs / 24)} days ago`
}

export default function AutoSendPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [last, setLast] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  async function load(reset = false) {
    const res = await fetch('/api/schedule-link', {
      method: reset ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: reset ? JSON.stringify({ reset: true }) : undefined,
    })
    if (res.ok) {
      const d = await res.json()
      setUrl(d.url)
      setLast(d.last_checked_at)
    }
  }
  useEffect(() => {
    setOrigin(window.location.origin)
    load()
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const checked = ago(last)
  const addUrl = origin
    ? `shortcuts://import-shortcut?url=${encodeURIComponent(origin + '/api/shortcut-file')}&name=${encodeURIComponent('Advance Check')}`
    : ''

  return (
    <div className="px-4 pt-4 pb-6">
      <button onClick={() => router.back()} className="mono-label mb-3 text-[11px] text-brand-600">
        ← Back
      </button>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-ink-900">Automatic sending</h1>
      <p className="mb-4 mt-1 text-sm text-ink-400">
        Schedule a text for later and your iPhone sends it by itself. Set this up once.
      </p>

      <Card className="mb-3">
        <p className="text-sm font-semibold text-ink-900">Is it working?</p>
        <p className="mt-1 text-sm text-ink-600">
          {checked ? `Your iPhone last checked ${checked}.` : 'Your iPhone has not checked yet. Finish the steps below.'}
        </p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => load()}>
          Refresh
        </Button>
      </Card>

      <Card className="mb-3">
        <p className="mb-2 text-sm font-semibold text-ink-900">Set up on your iPhone (about 2 minutes)</p>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-ink-600">
          <li>
            Tap <b>Copy your link</b> below.
          </li>
          <li>
            Tap <b>Add the shortcut</b>, then <b>Add Shortcut</b>. When it asks, paste your link.
            <div className="mt-2">
              {addUrl ? (
                <a href={addUrl} className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                  Add the shortcut
                </a>
              ) : null}
            </div>
          </li>
          <li>
            Open <b>Shortcuts</b> → <b>Automation</b> → <b>+</b> → <b>Time of Day</b>. Pick a time (for example 9:00 AM), choose{' '}
            <b>Daily</b> and <b>Run Immediately</b>, then pick the shortcut <b>Advance Check</b>.
          </li>
          <li>Add more Time of Day automations for other check times (for example 6:00 PM).</li>
        </ol>
        <p className="mt-3 text-xs text-ink-400">
          You also need your <b>{SHORTCUT_NAME}</b> shortcut installed (the one that sends the texts). A scheduled text goes
          out at the first check after its time. Your phone needs to be on and have service.
        </p>
      </Card>

      <Card className="mb-3">
        <p className="text-sm font-semibold text-ink-900">Your private link</p>
        <p className="mt-1 break-all rounded border border-ink-200 p-2 text-xs text-ink-500">{url || 'Loading…'}</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={copy} disabled={!url}>
            {copied ? 'Copied' : 'Copy your link'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (confirm('Make a new link? The old one stops working and you will need to paste the new one in your shortcut.')) load(true)
            }}
          >
            Make a new link
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-400">Only share this with yourself. It can only send texts you already scheduled.</p>
      </Card>
    </div>
  )
}
