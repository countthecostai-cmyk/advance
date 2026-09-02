'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ContactFormModal } from '@/components/contacts/ContactFormModal'
import { formatPhoneForDisplay } from '@/lib/phone'
import type { ContactWithGroups, ConsentEvent, ContactGroup } from '@/lib/types/database.types'

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [contact, setContact] = useState<ContactWithGroups | null>(null)
  const [history, setHistory] = useState<ConsentEvent[]>([])
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [showEdit, setShowEdit] = useState(false)

  async function load() {
    const [contactRes, groupsRes] = await Promise.all([fetch(`/api/contacts/${params.id}`), fetch('/api/groups')])
    if (contactRes.ok) {
      const data = await contactRes.json()
      setContact(data.contact)
      setHistory(data.consent_history)
    }
    if (groupsRes.ok) setGroups((await groupsRes.json()).groups)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function optOut() {
    if (!confirm('Mark this contact as opted out? They will be excluded from every future campaign.')) return
    await fetch(`/api/contacts/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opted_out: true, opted_out_reason: 'Manually marked opted out from contact page' }),
    })
    load()
  }

  async function remove() {
    if (!confirm('Delete this contact permanently?')) return
    await fetch(`/api/contacts/${params.id}`, { method: 'DELETE' })
    router.push('/contacts')
  }

  if (!contact) return <p className="p-6 text-center text-sm text-ink-400">Loading…</p>

  return (
    <div className="px-4 pt-4">
      <button onClick={() => router.back()} className="mb-3 text-sm font-medium text-brand-600">
        ← Back
      </button>

      <Card>
        <h1 className="text-xl font-bold text-ink-900">
          {contact.first_name} {contact.last_name}
        </h1>
        <p className="text-ink-500">{formatPhoneForDisplay(contact.phone_number)}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {contact.opted_out && <Badge tone="danger">Opted out</Badge>}
          <Badge tone={contact.consent_status === 'given' ? 'success' : 'neutral'}>
            Consent: {contact.consent_status}
          </Badge>
          {contact.groups?.map((g) => <Badge key={g.id}>{g.name}</Badge>)}
        </div>
        {contact.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-ink-600">{contact.notes}</p>}

        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
            Edit
          </Button>
          {!contact.opted_out && (
            <Button size="sm" variant="secondary" onClick={optOut}>
              Mark opted out
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={remove}>
            Delete
          </Button>
        </div>
      </Card>

      {contact.opted_out && (
        <Card className="mt-3 border-red-100 bg-red-50">
          <p className="text-sm text-red-800">
            Opted out {contact.opted_out_at ? new Date(contact.opted_out_at).toLocaleString() : ''}
            {contact.opted_out_reason ? ` — ${contact.opted_out_reason}` : ''}. This number is also on your
            suppression list and will be skipped by every campaign, even if re-imported.
          </p>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="mt-3">
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Consent history</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink-500">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between">
                <span className="capitalize">{h.status}</span>
                <span>{new Date(h.recorded_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ContactFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={load}
        groups={groups}
        initial={{
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone_number: contact.phone_number,
          notes: contact.notes,
          consent_status: contact.consent_status,
          group_ids: contact.groups?.map((g) => g.id) || [],
        }}
      />
    </div>
  )
}
