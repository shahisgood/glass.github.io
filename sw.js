/* Glass service worker — offline app shell.
   Bump CACHE when shipping a new version so old caches are purged. */
const CACHE = 'glass-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* navigations: network first, cached shell when offline */
  if (req.mode === 'navigate'){
    e.respondWith(
      fetch(req).catch(() =>
        caches.match('./index.html').then(r => r || caches.match('./'))
      )
    );
    return;
  }

  /* everything else (fonts, icons): cache first, then network + cache.
     Opaque responses (Google Fonts CDN) are cached as-is. */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
