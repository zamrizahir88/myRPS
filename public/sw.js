// Minimal service worker. Its job is to make the app installable and to keep
// the shell available offline; it deliberately does NOT cache API responses,
// because stale student records would be worse than an error message.
const CACHE = 'myrps-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Never serve Supabase from cache.
  if (url.origin !== self.location.origin) return

  // Network first, cache as a fallback, so a deploy is picked up immediately.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match('./index.html'))),
  )
})
