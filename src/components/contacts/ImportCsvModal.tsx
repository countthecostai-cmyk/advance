'use client'

import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function ImportCsvModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    setResult(null)
    const csv = await file.text()
    const res = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Import failed')
      return
    }
    const data = await res.json()
    setResult(data)
    onImported()
  }

  function close() {
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={close} title="Import contacts">
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-ink-500">
          CSV with columns: <code className="rounded bg-ink-100 px-1">first_name</code>,{' '}
          <code className="rounded bg-ink-100 px-1">last_name</code>,{' '}
          <code className="rounded bg-ink-100 px-1">phone_number</code>,{' '}
          <code className="rounded bg-ink-100 px-1">group</code>,{' '}
          <code className="rounded bg-ink-100 px-1">notes</code>,{' '}
          <code className="rounded bg-ink-100 px-1">consent_status</code>. Only first_name and phone_number are
          required — common header variations (&quot;Phone&quot;, &quot;First Name&quot;) are recognized
          automatically.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button onClick={() => fileRef.current?.click()} loading={busy} fullWidth variant="secondary">
          Choose CSV file
        </Button>

        {error && <p className="font-medium text-red-600">{error}</p>}

        {result && (
          <div className="rounded-xl bg-ink-50 p-3">
            <p className="font-semibold text-ink-900">
              {result.imported} added, {result.updated} updated, {result.failed} skipped
            </p>
            {result.truncated && (
              <p className="mt-1 text-amber-700">Only the first 5,000 rows were processed.</p>
            )}
            {result.errors?.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-ink-500">
                {result.errors.map((e: any, i: number) => (
                  <li key={i}>
                    Row {e.row}: {e.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
