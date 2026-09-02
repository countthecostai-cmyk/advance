'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Campaign, CampaignRecipient } from '@/lib/types/database.types'

interface StatusResponse {
  status: Campaign['status']
  recipient_count: number
  processed_count: number
  error_count: number
  skipped_count: number
  remaining: number
  awaiting_continue: boolean
}

const recipientStatusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'neutral',
  claimed: 'warning',
  handed_to_messages: 'success',
  skipped_suppressed: 'neutral',
  skipped_invalid: 'neutral',
  error: 'danger',
  stopped: 'neutral',
}

const recipientStatusLabel: Record<string, string> = {
  pending: 'Prepared',
  claimed: 'Sending…',
  handed_to_messages: 'Handed to Messages',
  skipped_suppressed: 'Skipped (suppressed)',
  skipped_invalid: 'Skipped (invalid)',
  error: 'Failed',
  stopped: 'Stopped',
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [preview, setPreview] = useState<any[]>([])
  const [statusData, setStatusData] = useState<StatusResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${params.id}`)
    if (!res.ok) return
    const data = await res.json()
    setCampaign(data.campaign)
    setRecipients(data.recipients)
  }, [params.id])

  const loadPreview = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${params.id}/preview`)
    if (res.ok) setPreview((await res.json()).samples || [])
  }, [params.id])

  const pollStatus = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${params.id}/status`)
    if (res.ok) setStatusData(await res.json())
  }, [params.id])

  useEffect(() => {
    load()
    loadPreview()
    pollStatus()
  }, [load, loadPreview, pollStatus])

  useEffect(() => {
    if (campaign && ['queued', 'sending'].includes(campaign.status)) {
      pollRef.current = setInterval(() => {
        pollStatus()
        load()
      }, 3000)
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
  }, [campaign, load, pollStatus])

  async function action(path: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/campaigns/${params.id}/${path}`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      return
    }
    if (data.shortcut_launch_url) {
      window.location.href = data.shortcut_launch_url
    }
    load()
    pollStatus()
  }

  if (!campaign) return <p className="p-6 text-center text-sm text-ink-400">Loading…</p>

  const remaining = statusData?.remaining ?? campaign.recipient_count - campaign.processed_count - campaign.error_count - campaign.skipped_count

  return (
    <div className="px-4 pt-4 pb-10">
      <button onClick={() => router.push('/campaigns')} className="mb-3 text-sm font-medium text-brand-600">
        ← Campaigns
      </button>

      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">{campaign.name}</h1>
        <Badge>{campaign.status}</Badge>
      </div>
      <p className="mb-4 text-sm text-ink-400">
        {campaign.recipient_count} recipient{campaign.recipient_count === 1 ? '' : 's'}
        {campaign.is_test_mode && ' · test mode'}
      </p>

      {['queued', 'sending', 'paused', 'completed', 'stopped'].includes(campaign.status) && (
        <Card className="mb-3">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold text-ink-900">
              {campaign.processed_count} handed to Messages
            </span>
            <span className="text-ink-400">{remaining} remaining</span>
          </div>
          <ProgressBar value={campaign.processed_count + campaign.error_count + campaign.skipped_count} max={campaign.recipient_count} />
          <div className="mt-2 flex gap-3 text-xs text-ink-400">
            {campaign.error_count > 0 && <span>{campaign.error_count} failed</span>}
            {campaign.skipped_count > 0 && <span>{campaign.skipped_count} skipped</span>}
          </div>
        </Card>
      )}

      <Card className="mb-3 border-brand-100 bg-brand-50">
        <p className="text-xs leading-relaxed text-brand-900">
          <strong>What these statuses mean:</strong> &quot;Handed to Messages&quot; means the Shortcut ran Apple&apos;s
          Send action with no reported error — it is not proof of delivery. Apple does not give third-party apps
          delivery or read receipts, so Advance never claims a message was delivered or read.
        </p>
      </Card>

      {preview.length > 0 && campaign.status === 'ready' && (
        <Card className="mb-3">
          <p className="mb-2 text-sm font-semibold text-ink-900">Preview ({preview.length} of {campaign.recipient_count})</p>
          <div className="flex flex-col gap-2">
            {preview.map((p, i) => (
              <div key={i} className="rounded-lg bg-ink-50 p-2 text-sm text-ink-700">
                <p className="mb-0.5 text-xs font-medium text-ink-400">
                  {p.first_name} {p.last_name}
                </p>
                {p.personalized_message}
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {campaign.status === 'ready' && (
          <Button
            fullWidth
            loading={busy}
            onClick={() => action('start', `Send ${campaign.recipient_count} message${campaign.recipient_count === 1 ? '' : 's'} through Apple Messages?`)}
          >
            Send with Apple Messages
          </Button>
        )}

        {['queued', 'sending'].includes(campaign.status) && !statusData?.awaiting_continue && (
          <Button fullWidth variant="secondary" loading={busy} onClick={() => action('pause')}>
            Pause
          </Button>
        )}

        {statusData?.awaiting_continue && (
          <Button fullWidth loading={busy} onClick={() => action('resume')}>
            Continue in Apple Messages ({remaining} left)
          </Button>
        )}

        {campaign.status === 'paused' && (
          <>
            <Button fullWidth loading={busy} onClick={() => action('resume')}>
              Resume in Apple Messages
            </Button>
            <Button fullWidth variant="danger" loading={busy} onClick={() => action('stop', 'Stop this campaign? Remaining recipients will not be messaged.')}>
              Stop campaign
            </Button>
          </>
        )}

        {['ready', 'queued', 'sending'].includes(campaign.status) && campaign.status !== 'paused' && (
          <Button fullWidth variant="ghost" loading={busy} onClick={() => action('stop', 'Stop this campaign? Remaining recipients will not be messaged.')}>
            Stop campaign
          </Button>
        )}
      </div>

      {recipients.length > 0 && campaign.status !== 'ready' && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-ink-900">Recipients</p>
          <div className="flex flex-col gap-1.5">
            {recipients.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-ink-100 bg-white px-3 py-2">
                <span className="text-sm text-ink-800">
                  {r.first_name} {r.last_name}
                </span>
                <Badge tone={recipientStatusTone[r.status]}>{recipientStatusLabel[r.status]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
