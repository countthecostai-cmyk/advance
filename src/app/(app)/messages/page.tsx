'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatPhoneForDisplay } from '@/lib/phone'
import type { Message } from '@/lib/types/database.types'

const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  prepared: 'neutral',
  handed_to_messages: 'success',
  failed: 'danger',
  unknown: 'neutral',
}

const statusLabel: Record<string, string> = {
  prepared: 'Prepared',
  handed_to_messages: 'Handed to Messages',
  failed: 'Failed',
  unknown: 'Unknown',
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<(Message & { campaign_name: string | null })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/messages')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Messages</h1>
      <p className="mb-4 text-sm text-ink-400">Every message Advance has handed to Apple Messages, across all campaigns.</p>

      {loading && <p className="py-8 text-center text-sm text-ink-400">Loading…</p>}

      {!loading && messages.length === 0 && (
        <EmptyState icon="💬" title="No messages yet" description="Once you send a campaign, its history shows up here." />
      )}

      <div className="flex flex-col gap-2">
        {messages.map((m) => (
          <div key={m.id} className="rounded-xl2 border border-ink-100 bg-white p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900">{formatPhoneForDisplay(m.phone_number)}</span>
              <Badge tone={statusTone[m.status]}>{statusLabel[m.status]}</Badge>
            </div>
            <p className="mb-1 line-clamp-2 text-sm text-ink-600">{m.body}</p>
            <p className="text-xs text-ink-400">
              {m.campaign_name ? `${m.campaign_name} · ` : ''}
              {new Date(m.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
