// Safari-only navigation stabilization.
// Keep Safari's native history entry for product pages so the iPhone back-swipe
// continues to work, while preventing the live catalogue from painting under the
// product layer during the gesture.
(() => {
  const ua = navigator.userAgent || '';
  const isIOSWebKit = window.hakiIOSWebKit === true;
  const isSafari = isIOSWebKit && /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(ua);
  if (!isSafari) return;

  const root = document.documentElement;
  root.classList.add('haki-safari-history-detail');

  const style = document.createElement('style');
  style.id = 'haki-safari-history-detail-style';
  style.textContent = `
    /* Preserve catalogue layout/scroll position but do not let its live pixels
       show beneath Safari's native back-swipe snapshot. */
    html.haki-safari-history-detail body.haki-ios-product-open #homeHero,
    html.haki-safari-history-detail body.haki-ios-product-open #novedades,
    html.haki-safari-history-detail body.haki-ios-product-open #collectionsSection,
    html.haki-safari-history-detail body.haki-ios-product-open #catalogo,
    html.haki-safari-history-detail body.haki-ios-product-open .footer{
      visibility:hidden!important;
      pointer-events:none!important;
    }

    /* The catalogue's generic stylesheet hides this link. On Safari we keep a
       persistent native-looking back control at the top of the product sheet. */
    html.haki-safari-history-detail body.haki-ios-product-open #productDetail .detail-back{
      display:flex!important;
      position:sticky!important;
      top:0!important;
      z-index:45!important;
      align-items:center;
      width:100%;
      min-height:46px;
      margin:0!important;
      padding:0 16px!important;
      border-bottom:1px solid rgba(0,0,0,.09);
      background:var(--surface,#fff)!important;
      font-size:12px;
      font-weight:700;
      letter-spacing:.01em;
      -webkit-backdrop-filter:none;
      backdrop-filter:none;
    }
    :root[data-theme='oscuro'] body.haki-ios-product-open #productDetail .detail-back{
      border-bottom-color:rgba(255,255,255,.14);
    }
  `;
  document.head.appendChild(style);

  let openedFromCatalogue = false;

  // app.js owns the actual product navigation and uses pushState on iOS. We only
  // remember that this product entry came from inside HAKI; we do not cancel it.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    let destination;
    try { destination = new URL(link.href, location.href); } catch { return; }
    if (destination.origin !== location.origin ||
        destination.pathname !== location.pathname ||
        destination.search !== location.search) return;
    if (!document.body.classList.contains('haki-ios-product-open') &&
        destination.hash.startsWith('#producto/')) {
      openedFromCatalogue = true;
    }
  }, true);

  // When the visible back control is used after entering from the catalogue,
  // consume the product history entry instead of creating another listing entry.
  document.addEventListener('click', event => {
    const back = event.target.closest?.('#productDetail .detail-back');
    if (!back || !document.body.classList.contains('haki-ios-product-open') || !openedFromCatalogue) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    history.back();
  }, true);

  // A successful native swipe/back returns to the catalogue and closes the PDP.
  window.addEventListener('popstate', () => {
    if (!location.hash.startsWith('#producto/')) openedFromCatalogue = false;
  });
})();
