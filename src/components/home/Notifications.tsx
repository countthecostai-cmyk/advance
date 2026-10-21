'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'

export interface NotificationItem {
  id: string
  title: string
  body: string
  link: string | null
}

export function Notifications({ items }: { items: NotificationItem[] }) {
  const [list, setList] = useState(items)
  if (list.length === 0) return null

  async function clear() {
    setList([])
    await fetch('/api/notifications', { method: 'POST' })
  }

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Reminders ({list.length})</p>
        <button onClick={clear} className="mono-label text-[10px] text-brand-600">
          Clear all
        </button>
      </div>
      <ul className="divide-y divide-ink-200">
        {list.slice(0, 5).map((n) => {
          const inner = (
            <div className="py-2">
              <p className="text-sm font-medium text-ink-900">{n.title}</p>
              {n.body && <p className="text-xs text-ink-400">{n.body}</p>}
            </div>
          )
          return <li key={n.id}>{n.link ? <Link href={n.link}>{inner}</Link> : inner}</li>
        })}
      </ul>
    </Card>
  )
}
