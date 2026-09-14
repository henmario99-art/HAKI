// Loaded in defer order before app.js. Navigation belongs to the router; this
// file enables the iOS layout and small Safari positioning corrections.
(() => {
  const ua = navigator.userAgent || '';
  const isIOS = /iP(?:hone|ad|od)/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.hakiIOSWebKit = isIOS;
  if (!isIOS) return;

  const root = document.documentElement;
  root.classList.add('haki-ios-webkit');
  const style = document.createElement('style');
  style.id = 'haki-ios-webkit-navigation-fix';
  style.textContent = `
    html.haki-ios-webkit{scroll-behavior:auto}
    html.haki-ios-webkit .product-image,
    html.haki-ios-webkit .collection-image,
    html.haki-ios-webkit #productDetail .detail-media{
      overflow:hidden;
      contain:paint;
    }
    html.haki-ios-webkit .product-image img,
    html.haki-ios-webkit .collection-image img{
      transform:none!important;
      transition:none!important;
    }
    html.haki-ios-webkit #productDetail .detail-gallery img{
      max-width:100%;
      max-height:100%;
    }
    html.haki-ios-webkit body.haki-ios-product-open{overflow:hidden}
    html.haki-ios-webkit body.haki-ios-product-open #productDetail{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      top:var(--haki-detail-top,76px);
      z-index:29;
      width:100%;
      max-width:none;
      margin:0;
      overflow-x:hidden;
      overflow-y:auto;
      overscroll-behavior-y:contain;
      background:var(--surface,#fff);
      isolation:isolate;
      contain:paint;
    }
    html.haki-ios-webkit #productDetail .detail-gallery{contain:paint}
    html.haki-ios-webkit body.haki-ios-product-open .detail-summary{top:0}
  `;
  document.head.appendChild(style);

  const header = document.querySelector('.header');
  const updateHeader = () => {
    if (!document.body.classList.contains('haki-ios-product-open')) return;
    root.style.setProperty('--haki-detail-top', `${header.getBoundingClientRect().bottom}px`);
  };
  window.addEventListener('resize', updateHeader, { passive:true });
  if (window.ResizeObserver && header) new ResizeObserver(updateHeader).observe(header);

  // Safari can restore a small previous scroll offset when the root URL is opened.
  // On a genuine root-page load, insist on the real top so the announcement bar
  // and the complete hero are visible. Do not do this for BFCache/history returns.
  let cancelInitialTop = false;
  const isRootEntry = () => !location.hash || location.hash === '#top';
  const forceRootTop = () => {
    if (cancelInitialTop || !isRootEntry()) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  const scheduleRootTop = () => {
    if (!isRootEntry()) return;
    requestAnimationFrame(() => requestAnimationFrame(forceRootTop));
    setTimeout(forceRootTop, 70);
    setTimeout(forceRootTop, 180);
  };
  window.addEventListener('touchstart', () => { cancelInitialTop = true; }, { once:true, passive:true });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) scheduleRootTop();
  });
  scheduleRootTop();

  // Category return is intentionally minimal. We only remember where the tile was
  // opened and restore that Y after app.js has completed its normal history route.
  const isCategoryHash = hash => /^#(?:coleccion|categoria)\//.test(hash || '');
  let categoryReturnY = null;
  let previousHash = location.hash || '#top';

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    let destination;
    try { destination = new URL(link.href, location.href); }
    catch { return; }

    if (destination.origin !== location.origin || destination.pathname !== location.pathname || destination.search !== location.search) return;

    if (!isCategoryHash(location.hash) && isCategoryHash(destination.hash)) {
      categoryReturnY = window.scrollY;
      return;
    }

    // The existing back link should use the same history entry as the browser's
    // Back gesture when this category was entered from the catalogue.
    if (link.matches('.back-home') && isCategoryHash(location.hash) && Number.isFinite(categoryReturnY)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      history.back();
    }
  }, true);

  window.addEventListener('popstate', () => {
    const nextHash = location.hash || '#top';
    const shouldRestore = isCategoryHash(previousHash) && !isCategoryHash(nextHash) && Number.isFinite(categoryReturnY);
    previousHash = nextHash;
    if (!shouldRestore) return;

    const targetY = categoryReturnY;
    // app.js handles the same popstate synchronously after this listener. Defer the
    // scroll until its Home/Collections sections have been made visible again.
    setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
      }));
    }, 0);
  });

  window.addEventListener('hashchange', () => {
    previousHash = location.hash || '#top';
  });
})();
