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

  // Category and product history/scroll restoration are owned by app.js.
})();
