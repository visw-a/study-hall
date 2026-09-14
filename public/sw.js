// Minimal offline support: network-first, falling back to whatever was
// last cached — so a page you've already opened once still loads with no
// connection (a flaky signal on mobile, offline on a plane, etc). It does
// not try to precache Vite's hashed build filenames; it just caches
// everything it sees fetched, which covers the app shell after first load.
const CACHE = 'study-hall-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  // Never cache/intercept the Claude API — always go straight to the network.
  if (req.url.includes('api.anthropic.com')) return

  event.respondWith(
    fetch(req)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(req, copy))
        return response
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match(self.registration.scope)))
  )
})
