'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { Terminology } from '@/lib/terminology'

export function NewGroupForm({ terminology: t }: { terminology: Terminology }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [groupType, setGroupType] = useState(t.groupTypes[0]?.value ?? '')
  const [description, setDescription] = useState('')
  const [meetingSchedule, setMeetingSchedule] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/community/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        group_type: groupType,
        description,
        meeting_schedule: meetingSchedule,
        location,
      }),
    })
    const body = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(body.error || 'Could not create this')
      return
    }
    router.replace(`/community/groups/${body.group.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. "${t.groupTypes[0]?.label}"`} required />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-700" htmlFor="group_type">
          Type
        </label>
        <select
          id="group_type"
          value={groupType}
          onChange={(e) => setGroupType(e.target.value)}
          className="tap-target h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          {t.groupTypes.map((gt) => (
            <option key={gt.value} value={gt.value}>
              {gt.label}
            </option>
          ))}
        </select>
      </div>

      <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Meets" value={meetingSchedule} onChange={(e) => setMeetingSchedule(e.target.value)} placeholder="Tuesdays, 7 PM" />
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 204" />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Button type="submit" fullWidth loading={loading}>
        Create {t.groupNoun.toLowerCase()}
      </Button>
    </form>
  )
}
