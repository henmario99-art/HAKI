/* Only installed windows use the recovered Android layout. No user-agent sniffing. */
(() => {
  const script = document.currentScript;
  const base = new URL('./', script ? script.src : location.href);
  const app = new URL('app/', base);
  const modes = ['standalone', 'window-controls-overlay']
    .map(mode => matchMedia(`(display-mode: ${mode})`));
  const installed = () => navigator.standalone === true || modes.some(mode => mode.matches);
  const inApp = location.pathname.startsWith(app.pathname);
  const file = location.pathname.slice((inApp ? app : base).pathname.length);
  const pages = ['', 'index.html', 'product', 'product.html', 'encomiendas', 'encomiendas.html', 'domicilios', 'domicilios.html', 'cambios-devoluciones', 'cambios-devoluciones.html'];
  function route() {
    if (!pages.includes(file) || installed() === inApp) return;
    const target = new URL(file === 'index.html' || /^product(?:\.html)?$/.test(file) ? './' : file, installed() ? app : base);
    target.search = location.search;
    target.hash = location.hash;
    location.replace(target.href);
  }
  route();
  addEventListener('pageshow', route);
  modes.forEach(mode => mode.addEventListener?.('change', route));
  // Never install a new worker over the normal website. App worker is /app/ only.
  if (inApp && installed() && 'serviceWorker' in navigator) {
    addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('sw.js', app), {scope: app.pathname, updateViaCache: 'none'})
        .catch(() => {}); // Online catalogue still works when storage is unavailable.
    }, {once: true});
  }
})();
