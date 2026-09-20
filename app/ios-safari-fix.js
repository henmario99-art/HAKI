// HAKI iOS/WebKit layout baseline.
// Categories and products use fixed scroll surfaces over the connected home.
// Returning reveals the original content without changing its root scroll.
(() => {
  const ua = navigator.userAgent || '';
  const isIOS = /iP(?:hone|ad|od)/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  window.hakiIOSWebKit = isIOS;
  if (!isIOS) return;

  const root = document.documentElement;
  root.classList.add('haki-ios-webkit');

  const style = document.createElement('style');
  style.id = 'haki-ios-webkit-navigation-fix';
  style.textContent = `
    html.haki-ios-webkit{
      scroll-behavior:auto!important;
      overscroll-behavior-x:none;
    }

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

    html.haki-ios-webkit body.haki-ios-category-open{
      overflow:hidden!important;
    }
    html.haki-ios-webkit .haki-ios-category-sheet{
      position:fixed!important;
      left:0!important;right:0!important;
      top:var(--haki-detail-top,76px)!important;bottom:0!important;
      z-index:40!important;
      width:100%!important;max-width:none!important;
      margin:0!important;padding:24px 4%!important;
      overflow-x:hidden!important;overflow-y:auto!important;
      overscroll-behavior:contain;
      -webkit-overflow-scrolling:touch;
      background:var(--surface,#fff)!important;
      isolation:isolate;contain:paint;
      transform:translateZ(0);
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
    }
    html.haki-ios-webkit .haki-ios-category-sheet .back-home{display:inline-block}

    /* Product detail sits above the active listing surface. The catalog underneath
       remains untouched at its exact scroll position and with the same decoded
       image nodes, so returning cannot repaint the list from bottom to top. */
    html.haki-ios-webkit body.haki-ios-product-open{
      overflow:hidden!important;
    }

    html.haki-ios-webkit body.haki-ios-product-open #productDetail{
      position:fixed!important;
      left:0!important;
      right:0!important;
      top:var(--haki-detail-top,76px)!important;
      bottom:0!important;
      z-index:45!important;
      width:100%!important;
      max-width:none!important;
      margin:0!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
      -webkit-overflow-scrolling:touch;
      overscroll-behavior:contain;
      background:var(--surface,#fff)!important;
      isolation:isolate;
      contain:paint;
      transform:translateZ(0);
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
    }

    html.haki-ios-webkit body.haki-ios-product-open #productDetail .detail-back{
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

    html.haki-ios-webkit #productDetail .detail-gallery img{
      max-width:100%;
      max-height:100%;
    }

    html.haki-ios-webkit body.haki-ios-product-open .detail-summary{
      top:0;
    }
  `;
  document.head.appendChild(style);

  const header = document.querySelector('.header');
  const updateDetailTop = () => {
    if (!document.body.classList.contains('haki-ios-product-open') &&
        !document.body.classList.contains('haki-ios-category-open')) return;
    const top = header?.getBoundingClientRect().bottom || 0;
    root.style.setProperty('--haki-detail-top', `${Math.max(0, Math.ceil(top))}px`);
  };

  window.addEventListener('resize', updateDetailTop, { passive:true });
  window.visualViewport?.addEventListener('resize', updateDetailTop, { passive:true });
  if (window.ResizeObserver && header) new ResizeObserver(updateDetailTop).observe(header);

  // Safari sometimes restores a stale root scroll offset on a fresh load.
  // Only normalize genuine home loads; history/category restoration belongs to app.js.
  let userInteracted = false;
  window.addEventListener('touchstart', () => { userInteracted = true; }, { once:true, passive:true });

  const normalizeFreshHome = () => {
    if (userInteracted || (location.hash && location.hash !== '#top')) return;
    window.scrollTo({ top:0, left:0, behavior:'instant' });
  };

  window.addEventListener('pageshow', event => {
    if (!event.persisted) requestAnimationFrame(normalizeFreshHome);
  });
})();
