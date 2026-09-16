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

    /* Category layers already start below the sticky header. Remove the large
       mobile catalog top padding so the heading does not get a second gap. */
    html.haki-ios-webkit.haki-ios-layered-navigation body.haki-ios-category-open #catalogo{
      padding-top:24px!important;
    }

    /*
      Safari category navigation is implemented as a fixed live layer. The
      previous home/category grid must never paint underneath that layer while
      it is being dragged to the right, otherwise WebKit exposes both image
      surfaces in the same frame. Keep the old sections genuinely hidden and
      paint a compositor-stable surface below the category instead.
    */
    html.haki-ios-webkit.haki-ios-layered-navigation body.haki-ios-category-open #homeHero[hidden],
    html.haki-ios-webkit.haki-ios-layered-navigation body.haki-ios-category-open #novedades[hidden],
    html.haki-ios-webkit.haki-ios-layered-navigation body.haki-ios-category-open #collectionsSection[hidden]{
      display:none!important;
    }
    #hakiIOSCategoryUnderlay{
      position:fixed;
      top:var(--haki-ios-category-top,0px);
      left:0;
      right:0;
      bottom:var(--haki-ios-bottom-ui,0px);
      z-index:27;
      pointer-events:none;
      background:var(--surface,#fff);
      opacity:0;
      visibility:hidden;
      contain:paint;
      isolation:isolate;
      transform:translate3d(0,0,0);
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
    }
    :root[data-theme='oscuro'] #hakiIOSCategoryUnderlay{
      background:var(--surface,#111);
    }
    html.haki-ios-webkit body.haki-ios-category-open #hakiIOSCategoryUnderlay,
    html.haki-ios-webkit body.haki-edge-back-active #hakiIOSCategoryUnderlay,
    html.haki-ios-webkit body.haki-ios-return-settling #hakiIOSCategoryUnderlay{
      opacity:1;
      visibility:visible;
    }

    /* A frozen copy of the visible category is kept below product detail while
       Safari performs the interactive Back gesture. It prevents the white
       compositor frame / bottom-to-top repaint seen on some product returns. */
    #hakiIOSListingSnapshot{
      position:fixed!important;
      top:var(--haki-ios-category-top,0px)!important;
      left:0!important;
      right:0!important;
      bottom:var(--haki-ios-bottom-ui,0px)!important;
      z-index:28!important;
      width:100%!important;
      max-width:none!important;
      height:auto!important;
      margin:0!important;
      padding-top:24px!important;
      overflow-x:hidden!important;
      overflow-y:hidden!important;
      pointer-events:none!important;
      background:var(--surface,#fff)!important;
      isolation:isolate;
      contain:paint;
      transform:translate3d(0,0,0)!important;
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
    }
    #hakiIOSListingSnapshot *{pointer-events:none!important}
    :root[data-theme='oscuro'] #hakiIOSListingSnapshot{background:var(--surface,#111)!important}
  `;
  document.head.appendChild(style);

  const categoryUnderlay = document.createElement('div');
  categoryUnderlay.id = 'hakiIOSCategoryUnderlay';
  categoryUnderlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(categoryUnderlay);

  let listingSnapshot = null;
  const removeListingSnapshot = () => {
    listingSnapshot?.remove();
    listingSnapshot = null;
  };
  const captureListingSnapshot = () => {
    if (!document.body.classList.contains('haki-ios-category-open')) return;
    const source = document.getElementById('catalogo');
    if (!source) return;
    removeListingSnapshot();
    const snapshot = source.cloneNode(true);
    snapshot.id = 'hakiIOSListingSnapshot';
    snapshot.hidden = false;
    snapshot.inert = true;
    snapshot.setAttribute('aria-hidden', 'true');
    snapshot.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    snapshot.querySelectorAll('a,button,input,select,textarea,summary').forEach(node => {
      node.tabIndex = -1;
      node.setAttribute('aria-hidden', 'true');
    });
    document.body.appendChild(snapshot);
    const scrollTop = source.scrollTop;
    snapshot.scrollTop = scrollTop;
    requestAnimationFrame(() => { snapshot.scrollTop = scrollTop; });
    listingSnapshot = snapshot;
  };
  const retireListingSnapshot = () => {
    if (location.hash.startsWith('#producto/')) return;
    requestAnimationFrame(() => requestAnimationFrame(removeListingSnapshot));
  };

  // This listener is registered before app.js, so the visible category is copied
  // before the router changes the hash or WebKit starts building the detail layer.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || !document.body.classList.contains('haki-ios-category-open')) return;
    let destination;
    try { destination = new URL(link.href, location.href); } catch { return; }
    if (destination.hash.startsWith('#producto/')) captureListingSnapshot();
  }, true);
  window.addEventListener('hashchange', retireListingSnapshot);
  window.addEventListener('popstate', retireListingSnapshot);
  window.addEventListener('pageshow', retireListingSnapshot);

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

  // Category and product history/scroll restoration are owned by app.js.
})();
