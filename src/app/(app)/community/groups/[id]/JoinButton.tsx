'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function JoinButton({ groupId, label }: { groupId: string; label: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function join() {
    setLoading(true)
    await fetch(`/api/community/groups/${groupId}/join`, { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <Button size="sm" onClick={join} loading={loading}>
      {label}
    </Button>
  )
}
