const CACHE_NAME = 'protlys-hub-shell-v3';
const OFFLINE_URL = '/login';
const OFFLINE_ASSETS = [
  OFFLINE_URL,
  '/protlys-logo-exact.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'no-store' })).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Keep the exact Protlys logo available when the login page is opened offline.
  if (url.pathname === '/protlys-logo-exact.png') {
    event.respondWith(
      caches.match('/protlys-logo-exact.png').then((cached) => cached || fetch(event.request))
    );
  }
});
