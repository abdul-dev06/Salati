// sw.js — Salati service worker
const CACHE = 'salati-v2';
const ASSETS = [
  '/Salati/',
  '/Salati/index.html',
  '/Salati/styles.css',
  '/Salati/app.js',
  '/Salati/tree.js',
  '/Salati/weather.js',
  '/Salati/manifest.json',
  '/Salati/assets/reminder.mp3',
  '/Salati/assets/athan.mp3',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always network-first for live data
  if (
    url.includes('docs.google.com') ||
    url.includes('open-meteo.com') ||
    url.includes('aladhan.com') ||
    url.includes('ipapi.co') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for all app assets
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
    )
  );
});
