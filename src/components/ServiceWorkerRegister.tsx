'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Service worker registration failed', err))

    // Pick up a new service worker as soon as it's installed, rather than
    // waiting for the next full app restart — important for a Home Screen
    // app a user might not "refresh" for weeks.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  return null
}
