const CACHE_NAME = 'protlys-hub-shell-v5';
const SHELL_URLS = ['/offline.html', '/protlys-logo-exact.png', '/manifest.webmanifest'];
const HASHED_ASSET = /-[A-Za-z0-9_-]{6,}\\.(?:js|css|woff2?|ttf|otf)$/;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('protlys-hub-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Only immutable, content-hashed build assets are cache-first.
  if (url.pathname.startsWith('/_next/static/') && HASHED_ASSET.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  // HTML is always revalidated first; retain the last successful page for offline launches.
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/index.html') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(new Request(request, { cache: 'no-store' }));
        if (response && response.ok && response.type !== 'opaque') {
          await cache.put(request, response.clone());
          if (url.pathname === '/') await cache.put('/index.html', response.clone());
        }
        return response;
      } catch {
        const exact = await cache.match(request);
        if (exact) return exact;
        const home = await cache.match('/index.html') || await cache.match('/');
        if (home) return home;
        return (await cache.match('/offline.html')) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
  }
});
