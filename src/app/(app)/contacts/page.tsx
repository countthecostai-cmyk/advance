'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContactFormModal } from '@/components/contacts/ContactFormModal'
import { ImportCsvModal } from '@/components/contacts/ImportCsvModal'
import { GroupManagerModal } from '@/components/contacts/GroupManagerModal'
import type { ContactWithGroups, ContactGroup } from '@/lib/types/database.types'
import { formatPhoneForDisplay } from '@/lib/phone'

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactWithGroups[]>([])
  const [groups, setGroups] = useState<(ContactGroup & { member_count?: number })[]>([])
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ContactWithGroups | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showGroups, setShowGroups] = useState(false)

  const loadContacts = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (activeGroup) params.set('group_id', activeGroup)
    const res = await fetch(`/api/contacts?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      setContacts(data.contacts)
    }
    setLoading(false)
  }, [search, activeGroup])

  const loadGroups = useCallback(async () => {
    const res = await fetch('/api/groups')
    if (res.ok) setGroups((await res.json()).groups)
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  useEffect(() => {
    const t = setTimeout(loadContacts, 200)
    return () => clearTimeout(t)
  }, [loadContacts])

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(contacts.filter((c) => !c.opted_out).map((c) => c.id)))
  }

  const activeCount = useMemo(() => contacts.filter((c) => !c.opted_out).length, [contacts])

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">Contacts</h1>
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="tap-target flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-xl text-white"
          aria-label="Add contact"
        >
          +
        </button>
      </div>

      <Input placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveGroup(null)}
          className={`tap-target shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
            !activeGroup ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'
          }`}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGroup(g.id)}
            className={`tap-target shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              activeGroup === g.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'
            }`}
          >
            {g.name} · {g.member_count ?? 0}
          </button>
        ))}
        <button
          onClick={() => setShowGroups(true)}
          className="tap-target shrink-0 rounded-full border border-dashed border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-500"
        >
          Manage groups
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-ink-400">
        <span>
          {contacts.length} contact{contacts.length === 1 ? '' : 's'}
          {selected.size > 0 && ` · ${selected.size} selected`}
        </span>
        <div className="flex gap-3">
          <button onClick={selectAll} className="font-medium text-brand-600">
            Select all ({activeCount})
          </button>
          <button onClick={() => setShowImport(true)} className="font-medium text-brand-600">
            Import
          </button>
          <a href="/api/contacts/export" className="font-medium text-brand-600">
            Export
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {loading && <p className="py-8 text-center text-sm text-ink-400">Loading…</p>}

        {!loading && contacts.length === 0 && (
          <EmptyState
            icon="👥"
            title="No contacts yet"
            description="Add your first contact or import a CSV to get started."
            action={
              <Button onClick={() => setShowForm(true)} size="sm">
                Add contact
              </Button>
            }
          />
        )}

        {contacts.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 rounded-xl2 border p-3 ${
              c.opted_out ? 'border-ink-100 bg-ink-50 opacity-60' : 'border-ink-100 bg-white'
            }`}
          >
            <button
              disabled={c.opted_out}
              onClick={() => toggleSelect(c.id)}
              className={`tap-target flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                selected.has(c.id) ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-300'
              }`}
            >
              {selected.has(c.id) && '✓'}
            </button>
            <button className="flex-1 text-left" onClick={() => router.push(`/contacts/${c.id}`)}>
              <p className="font-semibold text-ink-900">
                {c.first_name} {c.last_name}
              </p>
              <p className="text-sm text-ink-400">{formatPhoneForDisplay(c.phone_number)}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {c.opted_out && <Badge tone="danger">Opted out</Badge>}
                {c.consent_status === 'given' && <Badge tone="success">Consent given</Badge>}
                {c.groups?.map((g) => (
                  <Badge key={g.id}>{g.name}</Badge>
                ))}
              </div>
            </button>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-20 z-30 px-4">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl bg-ink-900 p-3 pl-4 text-white shadow-lg">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button
              size="sm"
              onClick={() => router.push(`/campaigns/new?contact_ids=${Array.from(selected).join(',')}`)}
            >
              New campaign →
            </Button>
          </div>
        </div>
      )}

      <ContactFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={loadContacts}
        groups={groups}
        initial={
          editing
            ? {
                id: editing.id,
                first_name: editing.first_name,
                last_name: editing.last_name,
                phone_number: editing.phone_number,
                notes: editing.notes,
                consent_status: editing.consent_status,
                group_ids: editing.groups?.map((g) => g.id) || [],
              }
            : undefined
        }
      />
      <ImportCsvModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => {
          loadContacts()
          loadGroups()
        }}
      />
      <GroupManagerModal
        open={showGroups}
        onClose={() => setShowGroups(false)}
        groups={groups}
        onChanged={loadGroups}
      />
    </div>
  )
}
