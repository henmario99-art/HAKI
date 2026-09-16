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
  `;
  document.head.appendChild(style);

  const categoryUnderlay = document.createElement('div');
  categoryUnderlay.id = 'hakiIOSCategoryUnderlay';
  categoryUnderlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(categoryUnderlay);

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
