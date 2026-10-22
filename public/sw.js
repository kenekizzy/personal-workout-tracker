const CACHE_NAME = 'workout-tracker-v1';

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/animations/bench_press.svg',
  '/animations/squat.svg',
  '/animations/deadlift.svg',
  '/animations/overhead_press.svg',
  '/animations/pull_up.svg',
  '/animations/dips.svg',
  '/animations/bicep_curl.svg',
  '/animations/barbell_row.svg',
  '/animations/lateral_raise.svg',
  '/animations/generic_exercise.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('Pre-caching partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cache-first strategy for local assets and navigation
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Cache valid responses for offline use
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.origin === self.location.origin)
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML navigation when offline
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
