'use client'

import { useEffect, useState } from 'react'

// True only inside the real App Store app (the Capacitor/WKWebView shell).
// Always false on the regular website, including Safari's "Add to Home
// Screen" — that's still a web page and still can't get native permissions.
export function useIsNativeApp(): boolean {
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (!cancelled) setIsNative(Capacitor.isNativePlatform())
      })
      .catch(() => {
        if (!cancelled) setIsNative(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return isNative
}
