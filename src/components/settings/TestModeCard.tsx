'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function TestModeCard({ ownPhoneNumber, onSaveNumber }: { ownPhoneNumber: string | null; onSaveNumber: (n: string) => Promise<void> }) {
  const router = useRouter()
  const [phone, setPhone] = useState(ownPhoneNumber || '')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    await onSaveNumber(phone)
    setSaving(false)
  }

  async function sendTest() {
    setSending(true)
    setError(null)
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test message to myself',
        message_template: "Hi {{first_name}}, this is a test message from Advance — if you got this, you're set up correctly!",
        is_test_mode: true,
        include_opt_out_footer: false,
      }),
    })
    setSending(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Could not create test campaign')
      return
    }
    const data = await res.json()
    router.push(`/campaigns/${data.campaign.id}`)
  }

  return (
    <Card>
      <p className="mb-2 text-sm font-semibold text-ink-900">Test mode</p>
      <p className="mb-3 text-xs text-ink-500">
        Your own phone number, used only so Test Mode can send to you before you ever message anyone else.
      </p>
      <div className="mb-3 flex gap-2">
        <Input placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button size="md" onClick={save} loading={saving}>
          Save
        </Button>
      </div>
      {error && <p className="mb-2 text-xs font-medium text-red-600">{error}</p>}
      <Button fullWidth variant="secondary" onClick={sendTest} loading={sending} disabled={!ownPhoneNumber}>
        Send test message to myself
      </Button>
    </Card>
  )
}
