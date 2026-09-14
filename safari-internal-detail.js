// Safari-only product detail navigation.
// Keeps product pages inside the current document so iOS Safari never performs
// its native history transition/snapshot when returning to the catalogue.
(() => {
  const ua = navigator.userAgent || '';
  const isIOSWebKit = window.hakiIOSWebKit === true;
  const isSafari = isIOSWebKit && /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(ua);
  if (!isSafari) return;

  const root = document.documentElement;
  root.classList.add('haki-safari-internal-detail');

  const style = document.createElement('style');
  style.id = 'haki-safari-internal-detail-style';
  style.textContent = `
    html.haki-safari-internal-detail body.haki-ios-product-open #productDetail .detail-back{
      display:inline-flex!important;
      align-items:center;
      min-height:44px;
      margin:0 0 14px;
      padding:0 16px;
      font-size:12px;
      font-weight:700;
      letter-spacing:.02em;
      background:var(--surface,#fff);
      position:relative;
      z-index:3;
    }
  `;
  document.head.appendChild(style);

  const sameDocumentDestination = link => {
    try {
      const destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin ||
          destination.pathname !== location.pathname ||
          destination.search !== location.search ||
          !destination.hash) return null;
      return destination;
    } catch {
      return null;
    }
  };

  const routeWithReplacement = hash => {
    const oldURL = location.href;
    const base = location.href.split('#')[0];
    const nextURL = `${base}${hash}`;
    if (nextURL === oldURL) return;

    history.replaceState(history.state, '', nextURL);

    let event;
    try {
      event = new HashChangeEvent('hashchange', { oldURL, newURL: nextURL });
    } catch {
      event = new Event('hashchange');
    }
    window.dispatchEvent(event);
  };

  // app.js already registered its capture listener before this file executes.
  // That listener records the catalogue scroll/filter state first. We then stop
  // the click before app.js's bubble listener can push a Safari history entry.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;

    const destination = sameDocumentDestination(link);
    if (!destination) return;

    const detailOpen = document.body.classList.contains('haki-ios-product-open') ||
      location.hash.startsWith('#producto/');
    const opensProduct = destination.hash.startsWith('#producto/');

    // Outside a product page, only product links are changed. All other Safari
    // navigation remains exactly as it was before this fix.
    if (!detailOpen && !opensProduct) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    // Recommendations can open from the cart. Close it before showing the PDP.
    if (opensProduct && document.body.classList.contains('cart-open')) {
      document.getElementById('closeCart')?.click();
    }

    routeWithReplacement(destination.hash);
  }, true);

  // Escape is useful with an external keyboard and mirrors the visible back link.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !document.body.classList.contains('haki-ios-product-open')) return;
    const back = document.querySelector('#productDetail .detail-back');
    if (!back) return;
    event.preventDefault();
    routeWithReplacement(new URL(back.href, location.href).hash || '#top');
  });
})();
