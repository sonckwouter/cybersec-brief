const CACHE_NAME = 'cybersec-brief-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './data/latest.json'
];

// Helper: Fetch and cache the latest news data
async function fetchAndCacheLatestNews() {
  try {
    const response = await fetch('./data/latest.json?cache_bust=' + Date.now());
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('./data/latest.json', response.clone());
      console.log('[ServiceWorker] Successfully downloaded latest news for offline reading.');
      return true;
    }
  } catch (err) {
    console.warn('[ServiceWorker] Background download failed:', err);
  }
  return false;
}

// Install: Pre-cache static assets and latest news data
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Background Sync (runs automatically when network recovers)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-latest-news') {
    event.waitUntil(fetchAndCacheLatestNews());
  }
});

// Periodic Background Sync (runs in background on Android Chrome, e.g. every morning)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-daily-news') {
    event.waitUntil(fetchAndCacheLatestNews());
  }
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Special handling for latest.json: Network-First with Cache Fallback (ignore query params)
  if (requestUrl.pathname.endsWith('data/latest.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('./data/latest.json', clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match('./data/latest.json', { ignoreSearch: true });
        })
    );
    return;
  }

  // Cache-First for static assets (HTML, CSS, JS, SVG, Manifest)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
