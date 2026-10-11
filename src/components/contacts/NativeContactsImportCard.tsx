'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useIsNativeApp } from '@/lib/useIsNativeApp'

// Shown only inside the real iPhone app (the Capacitor shell), never on the
// regular website in Safari/Chrome -- a browser tab can't get native
// Contacts access on iOS no matter what, that's an Apple rule Advance can't
// route around. Inside the App Store app it can: this uses the device's own
// "Allow Advance to access your Contacts?" permission prompt, same as any
// other iPhone app, then pulls every contact straight in -- no Shortcut,
// no link, no copy-pasting a URL.
export function NativeContactsImportCard({ configured }: { configured: boolean }) {
  const isNative = useIsNativeApp()
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'denied' | 'error'>('idle')
  const [result, setResult] = useState<{ imported: number; updated: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function connect() {
    setStatus('running')
    setError(null)
    setResult(null)
    try {
      const { Contacts } = await import('@capacitor-community/contacts')

      let perm = await Contacts.checkPermissions()
      if (perm.contacts !== 'granted') {
        perm = await Contacts.requestPermissions()
      }
      if (perm.contacts !== 'granted' && perm.contacts !== 'limited') {
        setStatus('denied')
        return
      }

      const { contacts } = await Contacts.getContacts({
        projection: { name: true, phones: true },
      })

      const payload = contacts
        .map((c) => {
          const name = c.name?.display?.trim() || [c.name?.given, c.name?.family].filter(Boolean).join(' ').trim()
          const phone = c.phones?.[0]?.number?.trim()
          return name && phone ? { name, phone } : null
        })
        .filter((c): c is { name: string; phone: string } => !!c)

      if (payload.length === 0) {
        setError('No contacts with both a name and a phone number were found.')
        setStatus('error')
        return
      }

      // Send in batches of 500 so one giant address book can't time out a
      // single request or trip the server's per-request size limit.
      let imported = 0
      let updated = 0
      let failed = 0
      for (let i = 0; i < payload.length; i += 500) {
        const batch = payload.slice(i, i + 500)
        const res = await fetch('/api/contacts/import-native', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: batch, group: 'From iPhone' }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Could not save contacts')
        }
        const body = await res.json()
        imported += body.imported || 0
        updated += body.updated || 0
        failed += body.failed || 0
      }

      setResult({ imported, updated, failed })
      setStatus('done')
      // Mark contacts-import as configured on the profile (shared flag with
      // the web Shortcut flow) so Settings shows "Connected" next time.
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_contacts_import_configured: true }),
      }).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong connecting your Contacts.')
      setStatus('error')
    }
  }

  // Never shows on the website -- only inside the native app shell.
  if (!isNative) return null

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Your Contacts</p>
        {configured ? <Badge tone="success">Connected</Badge> : <Badge tone="warning">Not connected</Badge>}
      </div>
      <p className="mb-4 text-xs text-ink-500">
        One tap, one native iPhone permission prompt — Advance pulls in everyone from your Contacts app with a phone
        number. No Shortcut to build, no link to copy.
      </p>

      <Button fullWidth size="sm" onClick={connect} loading={status === 'running'}>
        {configured ? 'Sync my Contacts again' : 'Connect my Contacts'}
      </Button>

      {status === 'denied' && (
        <p className="mt-3 text-xs text-ink-400">
          Contacts access was turned off. Open the iPhone <strong>Settings</strong> app → <strong>Advance</strong> →
          turn on <strong>Contacts</strong>, then try again.
        </p>
      )}

      {status === 'done' && result && (
        <p className="mt-3 text-xs text-emerald-400">
          Added {result.imported}, updated {result.updated}
          {result.failed ? `, skipped ${result.failed} (missing a name or valid number)` : ''}.
        </p>
      )}

      {status === 'error' && error && <p className="mt-3 text-xs font-medium text-red-400">{error}</p>}
    </Card>
  )
}
