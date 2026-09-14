// Safari-only product navigation: use a real document navigation for PDPs.
// This keeps iPhone's native back-swipe, but avoids animating two states of the
// same DOM tree (the source of the one-frame product/catalogue overlap).
(() => {
  const ua = navigator.userAgent || '';
  const isIOSWebKit = window.hakiIOSWebKit === true;
  const isSafari = isIOSWebKit && /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(ua);
  if (!isSafari) return;

  const PRODUCT_PATH = '/product';
  const isProductDocument = /\/product(?:\.html)?\/?$/.test(location.pathname);
  const RETURN_KEY = 'haki:safari-product-return';

  // app.js switches iOS to manual restoration for the old same-document router.
  // Safari PDPs are now separate documents, so native restoration is preferable.
  try { history.scrollRestoration = 'auto'; } catch {}

  const style = document.createElement('style');
  style.id = 'haki-safari-real-document-style';
  style.textContent = `
    html.haki-safari-real-product body.haki-ios-product-open #homeHero,
    html.haki-safari-real-product body.haki-ios-product-open #novedades,
    html.haki-safari-real-product body.haki-ios-product-open #collectionsSection,
    html.haki-safari-real-product body.haki-ios-product-open #catalogo,
    html.haki-safari-real-product body.haki-ios-product-open .footer{
      visibility:hidden!important;
      pointer-events:none!important;
    }
    html.haki-safari-real-product body.haki-ios-product-open #productDetail .detail-back{
      display:flex!important;
      position:sticky!important;
      top:0!important;
      z-index:60!important;
      align-items:center;
      width:100%;
      min-height:48px;
      margin:0!important;
      padding:0 16px!important;
      border-bottom:1px solid rgba(0,0,0,.10);
      background:var(--surface,#fff)!important;
      font-size:12px;
      font-weight:700;
      letter-spacing:.01em;
    }
    :root[data-theme='oscuro'] body.haki-ios-product-open #productDetail .detail-back{
      border-bottom-color:rgba(255,255,255,.14);
    }
  `;
  document.head.appendChild(style);
  if (isProductDocument) document.documentElement.classList.add('haki-safari-real-product');

  const sameOriginURL = link => {
    try {
      const url = new URL(link.href, location.href);
      return url.origin === location.origin ? url : null;
    } catch {
      return null;
    }
  };

  const saveReturnState = () => {
    try {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({
        href: location.href,
        y: window.scrollY,
        time: Date.now()
      }));
    } catch {}
  };

  const readReturnState = () => {
    try { return JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null'); }
    catch { return null; }
  };

  const productURLFor = destination => {
    const url = new URL(PRODUCT_PATH, location.origin);
    let code = '';
    try { code = decodeURIComponent(destination.hash.replace(/^#producto\//, '')); } catch {}
    // The query makes product-to-product navigation a true document navigation too.
    if (code) url.searchParams.set('product', code);
    url.hash = destination.hash;
    return url;
  };

  // On the catalogue page, replace only product-link navigation. app.js's capture
  // listener runs first and can preserve any internal state; this listener prevents
  // its bubble-phase pushState router from handling the click afterwards.
  if (!isProductDocument) {
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const destination = sameOriginURL(link);
      if (!destination || !destination.hash.startsWith('#producto/')) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      saveReturnState();
      location.assign(productURLFor(destination).href);
    }, true);

    // If Safari had to recreate the catalogue instead of restoring it from BFCache,
    // put the shopper back at the exact scroll position saved before opening the PDP.
    window.addEventListener('pageshow', () => {
      const saved = readReturnState();
      if (!saved || !Number.isFinite(saved.y)) return;
      const savedURL = new URL(saved.href, location.href);
      if (savedURL.pathname !== location.pathname || savedURL.search !== location.search || savedURL.hash !== location.hash) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - saved.y) > 2) window.scrollTo({ top: saved.y, behavior: 'instant' });
      }));
    });
    return;
  }

  // Product document: keep the visible Back control permanently available and
  // consume the real browser history entry. Native edge-swipe uses the same entry.
  document.addEventListener('click', event => {
    const back = event.target.closest?.('#productDetail .detail-back');
    if (!back || !document.body.classList.contains('haki-ios-product-open')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const saved = readReturnState();
    if (saved) history.back();
    else location.assign(new URL('/index.html', location.origin).href);
  }, true);

  // Product recommendations should also remain true document navigations instead
  // of returning to the old same-document hash router.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.matches('#productDetail .detail-back') || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = sameOriginURL(link);
    if (!destination) return;

    if (destination.hash.startsWith('#producto/')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(productURLFor(destination).href);
      return;
    }

    // Header/menu links from a PDP should return to the real catalogue document,
    // not reveal the hidden catalogue living underneath the product route.
    if (destination.pathname === location.pathname && destination.hash) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const catalogue = new URL('/index.html', location.origin);
      catalogue.hash = destination.hash;
      location.assign(catalogue.href);
    }
  }, true);
})();
