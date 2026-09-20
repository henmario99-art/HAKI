/* HAKI PWA v30: app-only scope. Fast startup, no stale legacy cover. */
const CACHE = 'haki-installed-shell-v30';
const SHELL = ["./android-cover-v27.css","./app-detail.css","./app-motion.css","./app-motion.js","./app-visual.css","./app.js","./cambios-devoluciones.html","./catalog-loader.js","./cover-bootstrap.js","./cover-v15.css","./cover-v15.js","./cover-v16-fix.js","./domicilios.html","./doufu-runtime.css","./doufu-runtime.js","./encomiendas.html","./enhancements.css","./enhancements.js","./experience-config.js","./experience.css","./gymrat-test.css","./gymrat-test.js","./image-manifest.js","./index.html","./info.css","./info.js","./ios-safari-fix.js","./native-android-cover-fix.js","./personalization.js","./pwa-status.js","./safari-internal-detail.js","./storefront-config.js","./styles.css","./","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-512-maskable.png","../pwa-mode.js","../productos.js"];
const allowed = new Set(SHELL.map(file => new URL(file, self.location.href).pathname));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('haki-installed-shell-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !allowed.has(url.pathname)) return;
  // Network-first keeps shared catalogue and code current, cached shell is offline-only.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = new URL(url.pathname, url.origin).href;
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic') await cache.put(key, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(key);
      if (cached) return cached;
      throw error;
    }
  })());
});

