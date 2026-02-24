const CACHE_NAME = 'ariel-mint-v1'
const OFFLINE_URL = '/offline'

// Static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip API routes and Next.js internals
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML responses
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Serve from cache on network failure
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/dashboard') || new Response('Offline', { status: 503 })
        })
      })
  )
})
