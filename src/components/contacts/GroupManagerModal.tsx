'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { ContactGroup } from '@/lib/types/database.types'

export function GroupManagerModal({
  open,
  onClose,
  groups,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  groups: (ContactGroup & { member_count?: number })[]
  onChanged: () => void
}) {
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function createGroup() {
    if (!newName.trim()) return
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Could not create group')
      return
    }
    setNewName('')
    setError(null)
    onChanged()
  }

  async function rename(id: string) {
    if (!renameValue.trim()) return
    await fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim() }),
    })
    setRenaming(null)
    onChanged()
  }

  async function remove(id: string) {
    if (!confirm('Delete this group? Contacts stay, they just lose this group tag.')) return
    await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    onChanged()
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage groups">
      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <div key={g.id} className="flex items-center gap-2 rounded-xl border border-ink-100 p-3">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
            {renaming === g.id ? (
              <input
                autoFocus
                defaultValue={g.name}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => rename(g.id)}
                onKeyDown={(e) => e.key === 'Enter' && rename(g.id)}
                className="flex-1 rounded-lg border border-ink-200 px-2 py-1 text-sm"
              />
            ) : (
              <span className="flex-1 text-sm font-medium text-ink-900">{g.name}</span>
            )}
            <span className="text-xs text-ink-400">{g.member_count ?? 0}</span>
            <button
              className="tap-target px-2 text-xs font-medium text-brand-600"
              onClick={() => {
                setRenaming(g.id)
                setRenameValue(g.name)
              }}
            >
              Rename
            </button>
            <button className="tap-target px-2 text-xs font-medium text-red-600" onClick={() => remove(g.id)}>
              Delete
            </button>
          </div>
        ))}

        <div className="mt-2 flex gap-2">
          <Input placeholder="New group name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={createGroup} size="md">
            Add
          </Button>
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
