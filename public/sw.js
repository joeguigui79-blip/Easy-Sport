const CACHE_NAME = 'easy-sport-v23';
const BASE_PATH = self.location.pathname.replace(/\/sw\.js$/, '');
const BASE_WITH_SLASH = BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`;
const toBase = (p) => `${BASE_WITH_SLASH}${p}`;

// App assets (cache-first)
const ASSETS = [
  BASE_WITH_SLASH,
  toBase('index.html?v=18'),
  toBase('manifest.json?v=5'),
  toBase('css/style.css?v=16'),
  toBase('js/db.js?v=7'),
  toBase('js/auth.js?v=5'),
  toBase('js/exercises.js?v=5'),
  toBase('js/workout.js?v=11'),
  toBase('js/program.js?v=6'),
  toBase('js/stats.js?v=6'),
  toBase('js/route-planner.js?v=1'),
  toBase('js/route-guidance.js?v=1'),
  toBase('js/gps-tracker.js?v=10'),
  toBase('js/share-card.js?v=2'),
  toBase('js/outdoor.js?v=14'),
  toBase('js/app.js?v=8'),
  toBase('icons/icon-192.svg'),
  toBase('icons/icon-512.svg')
];

// Install: cache all app assets
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

// Fetch: BYPASS COMPLET pour tout CDN externe — laisser le navigateur gérer
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  const url = new URL(e.request.url);

  // *** BYPASS TOTAL pour CDN externes (tuiles OSM, Leaflet, CartoCDN, GraphHopper) ***
  // Ne pas appeler e.respondWith() = le navigateur fait la requête directement
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('tile.opentopomap.org') ||
    url.hostname.includes('stamen-tiles.a.ssl.fastly.net') ||
    url.hostname.includes('graphhopper.com')
  ) {
    return; // BYPASS — pas d'e.respondWith()
  }

  // Cache-first pour les assets de l'app
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, toCache);
        });
        return response;
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match(toBase('index.html'));
        }
      });
    })
  );
});

// Message handler
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
