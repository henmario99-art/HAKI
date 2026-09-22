/* HAKI installed mode v51: one storefront, one catalog, no duplicated /app cache. */
(() => {
  const script = document.currentScript;
  const base = new URL('./', script ? script.src : location.href);
  const app = new URL('app/', base);
  const inLegacyApp = location.pathname.startsWith(app.pathname);

  function rootTarget() {
    const relative = location.pathname.slice(app.pathname.length);
    const pages = new Set([
      '', 'index.html', 'product', 'product.html',
      'encomiendas', 'encomiendas.html',
      'domicilios', 'domicilios.html',
      'cambios-devoluciones', 'cambios-devoluciones.html'
    ]);
    const file = pages.has(relative) ? relative : '';
    const target = new URL(
      file === 'index.html' || /^product(?:\.html)?$/.test(file) ? './' : file,
      base
    );
    target.search = location.search;
    target.hash = location.hash;
    return target;
  }

  // Old installed versions launched /app/. Move them to the canonical
  // storefront before the duplicated app scripts have a chance to run.
  if (inLegacyApp) {
    location.replace(rootTarget().href);
    return;
  }

  // The legacy worker only controls /app/, but remove it and its shell caches
  // so an old installation cannot revive the broken duplicate catalog later.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(
        registrations
          .filter(registration => {
            try { return new URL(registration.scope).pathname.startsWith(app.pathname); }
            catch { return false; }
          })
          .map(registration => registration.unregister())
      ))
      .catch(() => {});
  }

  if ('caches' in window) {
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith('haki-installed-shell-'))
        .map(key => caches.delete(key))
    )).catch(() => {});
  }
})();
