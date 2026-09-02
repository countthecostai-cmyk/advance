'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPhoneForDisplay } from '@/lib/phone'
import type { SuppressionEntry } from '@/lib/types/database.types'

export function SuppressionListCard() {
  const [entries, setEntries] = useState<SuppressionEntry[]>([])
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function load() {
    const res = await fetch('/api/suppression')
    if (res.ok) setEntries((await res.json()).suppression)
  }

  useEffect(() => {
    load()
  }, [])

  async function add() {
    if (!phone.trim()) return
    setBusy(true)
    setError(null)
    const res = await fetch('/api/suppression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Could not add')
      return
    }
    setPhone('')
    load()
  }

  async function remove(id: string) {
    if (!confirm('Remove this number from your suppression list? They could be messaged again in future campaigns.')) return
    await fetch(`/api/suppression/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Suppression list</p>
        <span className="text-xs text-ink-400">{entries.length}</span>
      </div>
      <p className="mb-3 text-xs text-ink-500">
        Numbers here are excluded from every campaign automatically, even if re-imported. Added when someone taps
        your opt-out link, or manually here.
      </p>
      <div className="mb-3 flex gap-2">
        <Input placeholder="Add phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button size="md" onClick={add} loading={busy}>
          Add
        </Button>
      </div>
      {error && <p className="mb-2 text-xs font-medium text-red-600">{error}</p>}

      {entries.length > 0 && (
        <button onClick={() => setExpanded((v) => !v)} className="mb-2 text-xs font-medium text-brand-600">
          {expanded ? 'Hide list' : `Show list (${entries.length})`}
        </button>
      )}
      {expanded && (
        <div className="flex flex-col gap-1.5">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span>
                {formatPhoneForDisplay(e.phone_number)} <span className="text-xs text-ink-400">· {e.reason}</span>
              </span>
              <button onClick={() => remove(e.id)} className="text-xs font-medium text-red-600">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
