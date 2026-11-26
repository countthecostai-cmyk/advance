'use client'

import { useRouter } from 'next/navigation'

// The iPhone app has no browser Back button or swipe-back, so pages opened
// from Settings (Privacy, Terms, Support) need their own way back. Falls back
// to Home when the page was opened directly (e.g. from the App Store
// listing's link in Safari).
export function BackLink() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push('/home'))}
      className="mono-label mb-4 text-[11px] text-brand-600"
    >
      ← Back
    </button>
  )
}
