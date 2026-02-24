// Змініть версію при кожному оновленні додатку (tarot-v2 → tarot-v3 тощо)
const CACHE_NAME = 'tarot-v4';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => Promise.all(
            names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Зображення карт - network first (щоб завжди були свіжі)
    if (event.request.url.includes('wikimedia') || event.request.url.includes('wikipedia')) {
        event.respondWith(
            fetch(event.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => caches.match(event.request).then(r => r || new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect fill="#1a1a2e" width="100" height="150"/><text x="50" y="80" text-anchor="middle" fill="#d4af37" font-size="20">☽</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            )))
        );
        return;
    }

    // Решта - cache first (швидкий старт)
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
