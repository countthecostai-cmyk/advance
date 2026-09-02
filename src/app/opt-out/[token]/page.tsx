'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export default function OptOutPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  async function optOut() {
    setState('busy')
    const res = await fetch(`/api/opt-out/${params.token}`, { method: 'POST' })
    setState(res.ok ? 'done' : 'error')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-6 text-center safe-top safe-bottom">
      <div className="text-4xl">✋</div>
      {state === 'done' ? (
        <>
          <h1 className="text-xl font-bold text-ink-900">You&apos;re opted out</h1>
          <p className="max-w-xs text-sm text-ink-500">
            You won&apos;t receive any more texts from this number. This applies immediately.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-ink-900">Stop receiving texts?</h1>
          <p className="max-w-xs text-sm text-ink-500">
            Tap below to opt out of future messages from this number. You can also reply STOP directly.
          </p>
          <Button onClick={optOut} loading={state === 'busy'} size="lg">
            Opt me out
          </Button>
          {state === 'error' && <p className="text-sm font-medium text-red-600">This link is invalid or expired.</p>}
        </>
      )}
    </div>
  )
}
