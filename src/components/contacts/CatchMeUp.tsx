'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type Kind = 'note' | 'commitment' | 'follow_up'
interface Note {
  id: string
  kind: Kind
  body: string
  due_at: string | null
  done_at: string | null
  created_at: string
}
interface CatchUp {
  summary: string[]
  recent_texts: { body: string; created_at: string }[]
  notes: Note[]
}

const KIND_LABEL: Record<Kind, string> = { note: 'Note', commitment: 'I promised', follow_up: 'Follow up' }

export function CatchMeUp({ contactId, firstName }: { contactId: string; firstName: string }) {
  const [data, setData] = useState<CatchUp | null>(null)
  const [kind, setKind] = useState<Kind>('note')
  const [body, setBody] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/contacts/${contactId}/catch-up`)
    if (res.ok) setData(await res.json())
  }, [contactId])
  useEffect(() => {
    load()
  }, [load])

  async function add() {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, body, due_at: due || null }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not save')
    setBody('')
    setDue('')
    load()
  }

  async function toggle(n: Note) {
    await fetch(`/api/contact-notes/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !n.done_at }),
    })
    load()
  }
  async function remove(n: Note) {
    await fetch(`/api/contact-notes/${n.id}`, { method: 'DELETE' })
    load()
  }

  if (!data) return null
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Card className="mt-3">
      <h2 className="mb-2 text-sm font-semibold text-ink-900">Catch me up on {firstName}</h2>
      <div className="mb-3 space-y-1 text-sm text-ink-600">
        {data.summary.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>

      {data.recent_texts.length > 0 && (
        <div className="mb-3">
          <p className="mono-label mb-1 text-[9.5px] text-ink-500">Last texts you sent</p>
          <ul className="space-y-1 text-sm text-ink-500">
            {data.recent_texts.map((t, i) => (
              <li key={i} className="truncate">
                {new Date(t.created_at).toLocaleDateString()} — {t.body}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.notes.length > 0 && (
        <ul className="mb-3 divide-y divide-ink-200">
          {data.notes.map((n) => (
            <li key={n.id} className="flex items-start gap-2 py-2">
              {n.kind !== 'note' && (
                <input type="checkbox" checked={!!n.done_at} onChange={() => toggle(n)} className="mt-1" aria-label="Done" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.done_at ? 'text-ink-400 line-through' : 'text-ink-900'}`}>{n.body}</p>
                <p className="text-[11px] text-ink-400">
                  {KIND_LABEL[n.kind]} · {new Date(n.created_at).toLocaleDateString()}
                  {n.due_at && (
                    <span className={!n.done_at && n.due_at < today ? ' text-red-400' : ''}> · due {n.due_at}</span>
                  )}
                </p>
              </div>
              <button onClick={() => remove(n)} className="text-xs text-ink-400" aria-label="Delete">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-1.5">
        {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full border px-3 py-1 text-xs ${kind === k ? 'border-brand-600 text-brand-600' : 'border-ink-200 text-ink-400'}`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={`What should you remember about ${firstName}?`}
        className="mt-2 w-full rounded border border-ink-200 bg-transparent p-2 text-sm text-ink-900"
      />
      {kind !== 'note' && (
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="mt-2 rounded border border-ink-200 bg-transparent p-1.5 text-sm text-ink-900"
          aria-label="Due date"
        />
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      <Button size="sm" className="mt-2" onClick={add} disabled={busy || !body.trim()}>
        Save
      </Button>
    </Card>
  )
}
