'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { Terminology } from '@/lib/terminology'

export function NewEventForm({ groupId, terminology: t }: { groupId: string; terminology: Terminology }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/community/groups/${groupId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, starts_at: startsAt, location, description }),
    })
    const body = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(body.error || 'Could not create this')
      return
    }
    router.replace(`/community/events/${body.event.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.groupTypes[0]?.label} required />
      <Input label="Date & time" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 204" />
      <Textarea label="Notes" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Button type="submit" fullWidth loading={loading}>
        Create {t.eventNoun.toLowerCase()}
      </Button>
    </form>
  )
}
