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

// ---------- notifications ----------------------------------------------------
// The server sends { title, body, url, tag }. A push that shows nothing makes
// the browser show its own "this site was updated in the background", so
// something is always shown, even if the payload could not be read.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'myRPS', {
      body: data.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      // Same tag replaces rather than stacks, if the same event arrives twice.
      tag: data.tag,
      data: { url: data.url || '' },
    }),
  )
})

// Tapping one brings the app forward on the right page, reusing the window
// that is already open rather than starting a second copy.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '', self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.registration.scope))
      if (open) return open.navigate(target).then((w) => (w || open).focus())
      return self.clients.openWindow(target)
    }),
  )
})
