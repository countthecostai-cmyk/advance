'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Campaign, CampaignStatus } from '@/lib/types/database.types'

const statusTone: Record<CampaignStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'neutral',
  ready: 'info',
  queued: 'warning',
  sending: 'warning',
  paused: 'warning',
  completed: 'success',
  stopped: 'danger',
  failed: 'danger',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/campaigns')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">Campaigns</h1>
        <Link href="/campaigns/new" className="tap-target flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-xl text-white">
          +
        </Link>
      </div>

      {loading && <p className="py-8 text-center text-sm text-ink-400">Loading…</p>}

      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon="📣"
          title="No campaigns yet"
          description="Create your first campaign to start sending through Apple Messages."
          action={
            <Link href="/campaigns/new">
              <Button size="sm">New campaign</Button>
            </Link>
          }
        />
      )}

      <div className="flex flex-col gap-3">
        {campaigns.map((c) => (
          <Link key={c.id} href={`/campaigns/${c.id}`} className="block rounded-xl2 border border-ink-100 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-semibold text-ink-900">{c.name}</p>
              <Badge tone={statusTone[c.status]}>{c.status}</Badge>
            </div>
            <p className="mb-2 text-xs text-ink-400">
              {c.recipient_count} recipient{c.recipient_count === 1 ? '' : 's'} · {new Date(c.created_at).toLocaleDateString()}
            </p>
            {['queued', 'sending', 'paused', 'completed'].includes(c.status) && (
              <ProgressBar value={c.processed_count + c.error_count + c.skipped_count} max={c.recipient_count} />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
