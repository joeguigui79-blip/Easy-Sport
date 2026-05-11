const CACHE_NAME = 'easy-sport-v3';
const BASE_PATH = self.location.pathname.replace(/\/sw\.js$/, '');
const BASE_WITH_SLASH = BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`;
const toBase = (p) => `${BASE_WITH_SLASH}${p}`;
const ASSETS = [
  BASE_WITH_SLASH,
  toBase('index.html'),
  toBase('manifest.json'),
  toBase('css/style.css'),
  toBase('js/db.js'),
  toBase('js/pin.js'),
  toBase('js/exercises.js'),
  toBase('js/workout.js'),
  toBase('js/program.js'),
  toBase('js/stats.js'),
  toBase('js/app.js'),
  toBase('icons/icon-192.svg'),
  toBase('icons/icon-512.svg')
];

// Install: cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache first, then network
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;
  // Skip chrome-extension and non-http(s) requests
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, toCache);
        });
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') {
          return caches.match(toBase('index.html'));
        }
      });
    })
  );
});

// Background sync / push (placeholder)
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
