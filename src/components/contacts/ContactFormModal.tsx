'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { ContactGroup } from '@/lib/types/database.types'

export interface ContactFormValues {
  id?: string
  first_name: string
  last_name: string
  phone_number: string
  notes: string
  consent_status: 'unknown' | 'given' | 'implied' | 'declined'
  group_ids: string[]
}

export function ContactFormModal({
  open,
  onClose,
  onSaved,
  groups,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  groups: ContactGroup[]
  initial?: ContactFormValues
}) {
  const [values, setValues] = useState<ContactFormValues>(
    initial || { first_name: '', last_name: '', phone_number: '', notes: '', consent_status: 'unknown', group_ids: [] }
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(
        initial || { first_name: '', last_name: '', phone_number: '', notes: '', consent_status: 'unknown', group_ids: [] }
      )
      setError(null)
    }
  }, [open, initial])

  async function save() {
    setSaving(true)
    setError(null)
    const url = values.id ? `/api/contacts/${values.id}` : '/api/contacts'
    const method = values.id ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Could not save contact')
      return
    }
    onSaved()
    onClose()
  }

  function toggleGroup(id: string) {
    setValues((v) => ({
      ...v,
      group_ids: v.group_ids.includes(id) ? v.group_ids.filter((g) => g !== id) : [...v.group_ids, id],
    }))
  }

  return (
    <Modal open={open} onClose={onClose} title={values.id ? 'Edit contact' : 'Add contact'}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            value={values.first_name}
            onChange={(e) => setValues({ ...values, first_name: e.target.value })}
            required
          />
          <Input
            label="Last name"
            value={values.last_name}
            onChange={(e) => setValues({ ...values, last_name: e.target.value })}
          />
        </div>
        <Input
          label="Phone number"
          type="tel"
          placeholder="(555) 123-4567"
          value={values.phone_number}
          onChange={(e) => setValues({ ...values, phone_number: e.target.value })}
          required
        />
        <Textarea
          label="Notes"
          rows={2}
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Consent</label>
          <div className="flex gap-2">
            {(['unknown', 'given', 'implied', 'declined'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setValues({ ...values, consent_status: s })}
                className={`tap-target flex-1 rounded-lg border px-2 py-2 text-xs font-medium capitalize ${
                  values.consent_status === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {groups.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Groups</label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`tap-target rounded-full border px-3 py-1.5 text-xs font-medium ${
                    values.group_ids.includes(g.id) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <Button onClick={save} loading={saving} fullWidth disabled={!values.first_name || !values.phone_number}>
          {values.id ? 'Save changes' : 'Add contact'}
        </Button>
      </div>
    </Modal>
  )
}
