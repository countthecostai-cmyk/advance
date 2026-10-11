'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PlusIcon } from '@/components/ui/Icons'
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
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-ink-900">Advances</h1>
        <Link
          href="/campaigns/new"
          className="cut-corner tap-target flex h-10 w-10 items-center justify-center border border-brand-500 bg-brand-50 text-brand-600"
        >
          <PlusIcon className="h-4 w-4" />
        </Link>
      </div>

      {loading && <p className="py-8 text-center text-sm text-ink-400">Loading…</p>}

      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon="📣"
          title="No advances yet"
          description="Create your first advance to start sending through Apple Messages."
          action={
            <Link href="/campaigns/new">
              <Button size="sm">New advance</Button>
            </Link>
          }
        />
      )}

      <div className="flex flex-col gap-3">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/campaigns/${c.id}`}
            className="cut-corner block border border-ink-200 bg-ink-100 p-4"
          >
            <div className="mb-1 flex items-center justify-between">
              <p className="font-semibold text-ink-900">{c.name}</p>
              <Badge tone={statusTone[c.status]}>{c.status}</Badge>
            </div>
            <p className="readout mb-2 text-xs text-ink-400">
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
