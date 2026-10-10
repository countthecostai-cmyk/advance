'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ShortcutOnboarding } from '@/components/settings/ShortcutOnboarding'
import { TestModeCard } from '@/components/settings/TestModeCard'
import { SuppressionListCard } from '@/components/settings/SuppressionListCard'
import { createClient } from '@/lib/supabase/client'
import type { Profile, AuditLog } from '@/lib/types/database.types'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)

  async function load() {
    const res = await fetch('/api/profile')
    if (res.ok) setProfile((await res.json()).profile)
  }

  async function loadLogs() {
    const res = await fetch('/api/audit-logs')
    if (res.ok) setLogs((await res.json()).logs)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (profile) setName(profile.display_name || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name])

  async function saveName() {
    setSavingName(true)
    await updateProfile({ display_name: name.trim() || null } as any)
    setSavingName(false)
  }

  async function updateProfile(fields: Partial<Profile> & { mark_shortcut_configured?: boolean }) {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) setProfile((await res.json()).profile)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  if (!profile) return <p className="p-6 text-center text-sm text-ink-400">Loading…</p>

  return (
    <div className="px-4 pt-4 pb-10">
      <h1 className="mb-4 text-2xl font-bold text-ink-900">Settings</h1>

      <div className="flex flex-col gap-4">
        <ShortcutOnboarding
          configured={!!profile.shortcut_configured_at}
          onConfirm={() => updateProfile({ mark_shortcut_configured: true })}
        />

        <TestModeCard
          ownPhoneNumber={profile.own_phone_number}
          onSaveNumber={(n) => updateProfile({ own_phone_number: n } as any)}
        />

        <SuppressionListCard />

        <Card>
          <p className="mb-3 text-sm font-semibold text-ink-900">Sending limits</p>
          <div className="flex flex-col gap-2 text-sm text-ink-600">
            <div className="flex justify-between">
              <span>Daily send cap</span>
              <span className="font-medium text-ink-900">{profile.daily_send_cap} / 24h</span>
            </div>
            <div className="flex justify-between">
              <span>Max recipients per advance</span>
              <span className="font-medium text-ink-900">{profile.max_recipients_per_campaign}</span>
            </div>
            <div className="flex justify-between">
              <span>Cooldown between advances</span>
              <span className="font-medium text-ink-900">{profile.min_seconds_between_campaigns}s</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            These limits exist to keep your account&apos;s usage looking like a real person sending real texts —
            they can&apos;t be raised from here by design. See docs/COMPLIANCE.md.
          </p>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-900">Audit log</p>
            <button
              className="text-xs font-medium text-brand-600"
              onClick={() => {
                setShowLogs((v) => !v)
                if (!showLogs) loadLogs()
              }}
            >
              {showLogs ? 'Hide' : 'Show'}
            </button>
          </div>
          {showLogs && (
            <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto text-xs text-ink-500">
              {logs.length === 0 && <p>No activity yet.</p>}
              {logs.map((l) => (
                <div key={l.id} className="flex justify-between border-b border-ink-50 py-1">
                  <span>
                    {l.actor} · {l.action}
                  </span>
                  <span>{new Date(l.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-semibold text-ink-900">Account</p>
          <p className="mb-2 text-xs text-ink-500">Your name, shown on your home screen greeting.</p>
          <div className="mb-3 flex gap-2">
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button size="md" onClick={saveName} loading={savingName}>
              Save
            </Button>
          </div>
          {profile?.own_phone_number && (
            <p className="mb-3 text-sm text-ink-600">{profile.own_phone_number}</p>
          )}
          <Button variant="secondary" fullWidth onClick={signOut}>
            Sign out
          </Button>
          <p className="mt-2 text-xs text-ink-400">
            Signing out clears this account — there&apos;s no email or password to sign back in with.
          </p>
        </Card>
      </div>
    </div>
  )
}
