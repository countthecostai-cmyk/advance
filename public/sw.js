// Advance service worker.
//
// Goal: an "offline-friendly shell" — the app frame (nav, layout, static
// assets) loads instantly even on a bad connection, while every real read
// (contacts, campaigns, message status) always goes to the network, because
// this data changes constantly and stale campaign progress is worse than a
// loading spinner. This is deliberately NOT a full offline-first data cache.

const SHELL_CACHE = 'advance-shell-v1'
const SHELL_ASSETS = [
  '/',
  '/home',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => {
        // Best-effort — a missing route at install time shouldn't break
        // activation (e.g. during local dev before a build exists).
      })
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never cache API calls or Supabase auth traffic — always live data.
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('.supabase.co')) {
    return
  }

  // Network-first for navigations, falling back to the cached shell/offline
  // page so the app still opens (to a usable, if stale, frame) with no
  // connection — e.g. opening the Home Screen icon in a dead zone.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        () => caches.match(request).then((cached) => cached || caches.match('/offline'))
      )
    )
    return
  }

  // Cache-first for the static shell assets (icons, manifest); everything
  // else just falls through to the network untouched.
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
  }
})
