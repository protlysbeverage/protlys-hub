const CACHE_NAME = 'protlys-hub-shell-v4';
const PRECACHE_URLS = [
  '/login',
  '/manifest',
  '/protlys-logo-exact.png',
  '/offline.html',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);

    // Precache the login shell's versioned Next.js assets. Additional route
    // assets are cached as they are requested after a successful visit.
    const loginResponse = await cache.match('/login');
    if (loginResponse) {
      const html = await loginResponse.clone().text();
      const assets = [...html.matchAll(/["']([^"']*\/_next\/static\/[^"']+)["']/g)]
        .map(match => match[1])
        .filter(path => path.startsWith('/_next/static/'));
      await Promise.all(assets.map(async path => {
        try {
          const response = await fetch(path, { cache: 'reload' });
          if (response.ok) await cache.put(path, response);
        } catch {}
      }));
    }

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
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/protlys-logo-exact.png' ||
    url.pathname === '/manifest'
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) {
        event.waitUntil(fetch(event.request).then(response => {
          if (response.ok) return cache.put(event.request, response.clone());
        }).catch(() => {}));
        return cached;
      }
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'no-store' }))
        .catch(async () => (await caches.match('/offline.html')) || (await caches.match('/login')))
    );
  }
});
