// Each worker serves a complete, versioned app shell. Updates activate only
// after user confirmation (or when all old tabs close), never during a match.
const CACHE_NAME = 'fuchitron-v12';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/fonts.css', '/app.js', '/i18n.js', '/manifest.json',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png', '/icons/og-image.png', '/icons/logo.svg',
  '/fonts/font-1.woff2',
  '/fonts/font-10.woff2',
  '/fonts/font-2.woff2',
  '/fonts/font-3.woff2',
  '/fonts/font-4.woff2',
  '/fonts/font-5.woff2',
  '/fonts/font-6.woff2',
  '/fonts/font-7.woff2',
  '/fonts/font-8.woff2',
  '/fonts/font-9.woff2',
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('fuchitron-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    if (/^\/(live|s)(\/|$)/.test(url.pathname) || ['/live.html', '/spectate.html'].includes(url.pathname)) {
      event.respondWith(Response.redirect(new URL('/', url), 302));
      return;
    }
    if (!['/', '/index.html'].includes(url.pathname)) return;
    event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match('/index.html')) || fetch(request)));
    return;
  }
  // Do not cache analytics, arbitrary URLs, errors, or cross-origin responses.
  if (!ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    try { return await fetch(request); }
    catch { return Response.error(); }
  }));
});
