/* HAKI PWA v41: nuevo icono + cache-first shell. */
const SHELL_CACHE = 'haki-installed-shell-v41';
const IMAGE_CACHE = 'haki-installed-images-v1';
const SHELL = ["./android-cover-v27.css","./app-detail.css","./app-motion.css","./app-motion.js","./app-visual.css","./app.js","./cambios-devoluciones.html","./catalog-loader.js","./cover-bootstrap.js","./cover-v15.css","./cover-v15.js","./cover-v16-fix.js","./domicilios.html","./doufu-runtime.css","./doufu-runtime.js","./encomiendas.html","./enhancements.css","./enhancements.js","./experience-config.js","./experience.css","./gymrat-test.css","./gymrat-test.js","./image-manifest.js","./index.html","./info.css","./info.js","./ios-safari-fix.js","./native-android-cover-fix.js","./personalization.js","./pwa-status.js","./safari-internal-detail.js","./storefront-config.js","./styles.css","./","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-512-maskable.png","../pwa-mode.js","../productos.js"];
const shellPaths = new Set(SHELL.map(file => new URL(file, self.location.href).pathname));

async function trimImages(cache, maxEntries = 140) {
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map(key => cache.delete(key)));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('haki-installed-shell-') && key !== SHELL_CACHE) {
        await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isImage = event.request.destination === 'image' ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/.netlify/images';

  if (isImage) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(event.request, {ignoreVary:true});
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(event.request, response.clone()).then(() => trimImages(cache)).catch(() => {});
      }
      return response;
    })());
    return;
  }

  if (url.origin !== self.location.origin || !shellPaths.has(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const key = new Request(new URL(url.pathname, url.origin).href, {credentials:'same-origin'});
    const cached = await cache.match(key);
    const update = fetch(event.request).then(response => {
      if (response.ok && response.type === 'basic') {
        cache.put(key, response.clone()).catch(() => {});
      }
      return response;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(update);
      return cached;
    }
    return (await update) || Response.error();
  })());
});
