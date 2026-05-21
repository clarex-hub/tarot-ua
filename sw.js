const CACHE_NAME = 'tarot-v38';
const ASSETS = [
  './',
  './index.html'
];

// Які requesty cachujemy w runtime przy pierwszym fetchu (lazy cache)
const RUNTIME_CACHE_PATTERNS = [
  '/cards/',
  '.jpg',
  '.jpeg',
  '.png',
  '.svg',
  '.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Skip non-GET (POST do Gemini/OpenRouter API)
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Nie ruszamy zewnętrznych API
  if (url.includes('generativelanguage.googleapis.com') ||
      url.includes('openrouter.ai')) {
    return;
  }

  const shouldRuntimeCache = RUNTIME_CACHE_PATTERNS.some(p => url.includes(p));

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(resp => {
        // Cachujemy tylko OK responses (nie 4xx/5xx i nie opaque cross-origin)
        if (shouldRuntimeCache && resp && resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
});

// Komunikat z app -> SW: wymusza aktywację nowej wersji
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
