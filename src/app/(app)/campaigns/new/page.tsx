'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ContactWithGroups, ContactGroup } from '@/lib/types/database.types'
import { personalizeMessage } from '@/lib/personalization'
import { PERSONALIZATION_TOKENS } from '@/lib/constants'
import { formatPhoneForDisplay } from '@/lib/phone'

const STEPS = ['Recipients', 'Message', 'Options', 'Review'] as const

export default function NewCampaignPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [step, setStep] = useState(0)

  const [contacts, setContacts] = useState<ContactWithGroups[]>([])
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(params.get('contact_ids')?.split(',').filter(Boolean) || []))

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isTestMode, setIsTestMode] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [includeFooter, setIncludeFooter] = useState(true)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(3)
  const [chunkSize, setChunkSize] = useState(20)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/contacts?opted_out=false')
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts || []))
    fetch('/api/groups')
      .then((r) => r.json())
      .then((d) => setGroups(d.groups || []))
  }, [])

  const filtered = useMemo(() => {
    if (!search) return contacts
    const term = search.toLowerCase()
    return contacts.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) || c.phone_number.includes(search))
  }, [contacts, search])

  const selectedContacts = useMemo(() => contacts.filter((c) => selected.has(c.id)), [contacts, selected])
  const firstSample = selectedContacts[0]

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectGroup(groupId: string) {
    const ids = contacts.filter((c) => c.groups?.some((g) => g.id === groupId)).map((c) => c.id)
    setSelected((s) => new Set([...Array.from(s), ...ids]))
  }

  function insertToken(token: string) {
    setMessage((m) => m + token)
  }

  async function createCampaign() {
    setCreating(true)
    setError(null)
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || 'Untitled campaign',
        message_template: message,
        contact_ids: isTestMode ? [] : Array.from(selected),
        group_ids: [],
        is_test_mode: isTestMode,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        include_opt_out_footer: includeFooter,
        rate_limit_seconds: rateLimitSeconds,
        chunk_size: chunkSize,
      }),
    })
    setCreating(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Could not create campaign')
      return
    }
    const data = await res.json()
    router.push(`/campaigns/${data.campaign.id}`)
  }

  const canNext = [selected.size > 0 || isTestMode, message.trim().length > 0, true, true][step]

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm font-medium text-brand-600">
          ← Back
        </button>
        <h1 className="text-base font-semibold text-ink-900">New campaign</h1>
        <span className="w-10" />
      </div>

      <div className="mb-5 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-ink-100'}`} />
        ))}
      </div>

      {step === 0 && (
        <div>
          <label className="mb-2 flex items-center justify-between rounded-xl border border-ink-100 bg-white p-3">
            <span>
              <span className="block text-sm font-semibold text-ink-900">Test mode</span>
              <span className="block text-xs text-ink-400">Send only to your own number first</span>
            </span>
            <input type="checkbox" className="h-6 w-6" checked={isTestMode} onChange={(e) => setIsTestMode(e.target.checked)} />
          </label>

          {!isTestMode && (
            <>
              <Input placeholder="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => selectGroup(g.id)}
                    className="tap-target shrink-0 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600"
                  >
                    + {g.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-400">{selected.size} selected</p>
              <div className="mt-2 flex max-h-[45vh] flex-col gap-2 overflow-y-auto">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left ${
                      selected.has(c.id) ? 'border-brand-500 bg-brand-50' : 'border-ink-100 bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected.has(c.id) ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-300'
                      }`}
                    >
                      {selected.has(c.id) && '✓'}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-ink-900">
                        {c.first_name} {c.last_name}
                      </span>
                      <span className="block text-xs text-ink-400">{formatPhoneForDisplay(c.phone_number)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <Input label="Campaign name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Saturday event invite" />
          <Textarea
            label="Message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey {{first_name}}, wanted to invite you to our event this Saturday."
          />
          <div className="flex gap-2">
            {PERSONALIZATION_TOKENS.map((t) => (
              <button
                key={t}
                onClick={() => insertToken(t)}
                className="tap-target rounded-lg bg-ink-100 px-3 py-2 text-xs font-medium text-ink-600"
              >
                {t}
              </button>
            ))}
          </div>
          {message && (
            <Card className="bg-ink-50">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Preview</p>
              <p className="text-sm text-ink-800">
                {personalizeMessage(message, {
                  first_name: firstSample?.first_name || 'Alex',
                  last_name: firstSample?.last_name || 'Smith',
                })}
              </p>
            </Card>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <Input
            label="Schedule (optional)"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            hint="Leave blank to send as soon as you tap Send. Advance doesn't send in the background — you'll still tap Send with Apple Messages when you're ready."
          />
          <label className="flex items-center justify-between rounded-xl border border-ink-100 bg-white p-3">
            <span className="text-sm font-medium text-ink-900">Include STOP / opt-out link</span>
            <input type="checkbox" className="h-6 w-6" checked={includeFooter} onChange={(e) => setIncludeFooter(e.target.checked)} />
          </label>

          <button onClick={() => setShowAdvanced((v) => !v)} className="text-left text-sm font-medium text-brand-600">
            {showAdvanced ? 'Hide' : 'Show'} advanced settings
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Seconds between sends"
                type="number"
                min={1}
                max={60}
                value={rateLimitSeconds}
                onChange={(e) => setRateLimitSeconds(Number(e.target.value))}
                hint="Advisory only — Apple doesn't let us enforce this."
              />
              <Input
                label="Recipients per Shortcut run"
                type="number"
                min={1}
                max={50}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                hint="Smaller chunks = more reliable, easier to pause."
              />
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <Card>
            <p className="text-sm text-ink-500">Campaign</p>
            <p className="text-lg font-semibold text-ink-900">{name || 'Untitled campaign'}</p>
          </Card>
          <Card>
            <p className="text-sm text-ink-500">Recipients</p>
            <p className="text-lg font-semibold text-ink-900">
              {isTestMode ? 'Just you (test mode)' : `${selected.size} contact${selected.size === 1 ? '' : 's'}`}
            </p>
          </Card>
          <Card>
            <p className="mb-1 text-sm text-ink-500">Message</p>
            <p className="whitespace-pre-wrap text-sm text-ink-800">{message}</p>
          </Card>
          {scheduledAt && (
            <Card>
              <p className="text-sm text-ink-500">Scheduled for</p>
              <p className="text-sm font-medium text-ink-900">{new Date(scheduledAt).toLocaleString()}</p>
            </Card>
          )}
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <Button onClick={createCampaign} loading={creating} fullWidth>
            Create campaign
          </Button>
        </div>
      )}

      <div className="mt-6 flex gap-3 pb-8">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} fullWidth>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 && (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} fullWidth>
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}
