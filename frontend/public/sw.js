// SPDX-License-Identifier: AGPL-3.0-or-later
// Vĩnh Phát CRM — PWA Service Worker v1.0
const CACHE_NAME = 'vpcrm-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/brand/favicon.svg',
  '/brand/vp-monogram.png',
  '/brand/vp-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Bypass dynamic API, SSE, and WebSocket endpoints
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

