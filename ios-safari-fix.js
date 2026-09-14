(() => {
  const ua = navigator.userAgent || '';
  const isIOS = /iP(?:hone|ad|od)/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return;

  const root = document.documentElement;
  const body = document.body;
  const ids = ['homeHero', 'novedades', 'collectionsSection', 'catalogo'];
  const get = id => document.getElementById(id);
  const normalizeHash = value => {
    const raw = String(value || '').replace(/^#/, '');
    return raw ? `#${raw}` : '#top';
  };
  const hashFromUrl = value => {
    try { return normalizeHash(new URL(value, location.href).hash); }
    catch { return '#top'; }
  };

  root.classList.add('haki-ios-webkit');

  const style = document.createElement('style');
  style.id = 'haki-ios-webkit-navigation-fix';
  style.textContent = `
    html.haki-ios-webkit .product-image,
    html.haki-ios-webkit .collection-image,
    html.haki-ios-webkit #productDetail .detail-media,
    html.haki-ios-webkit #productDetail .detail-gallery{
      overflow:hidden!important;
      contain:none!important;
      isolation:auto!important;
    }
    html.haki-ios-webkit .product-image img,
    html.haki-ios-webkit .collection-image img,
    html.haki-ios-webkit #productDetail .detail-gallery img{
      -webkit-transform:none!important;
      transform:none;
      backface-visibility:visible;
    }
    html.haki-ios-webkit body.haki-ios-product-open{
      overflow:hidden!important;
    }
    html.haki-ios-webkit body.haki-ios-product-open #productDetail{
      display:block!important;
      position:fixed!important;
      left:0!important;
      right:0!important;
      bottom:0!important;
      top:110px!important;
      z-index:29!important;
      width:100%!important;
      max-width:none!important;
      margin:0!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
      -webkit-overflow-scrolling:touch;
      overscroll-behavior:contain;
      background:var(--surface,#fff)!important;
      contain:none!important;
      isolation:isolate;
    }
    html.haki-ios-webkit[data-theme=oscuro] body.haki-ios-product-open #productDetail{
      background:#151515!important;
    }
    @media(min-width:801px){
      html.haki-ios-webkit body.haki-ios-product-open #productDetail{top:122px!important}
    }
  `;
  document.head.appendChild(style);

  let sourceState = null;
  let sourceHash = '';
  let sourceScrollY = 0;

  function warmMountedImages() {
    document.querySelectorAll('#products .product-image img, #newProducts .product-image img').forEach(img => {
      if (img.complete && img.naturalWidth > 0) img.loading = 'eager';
    });
  }

  function captureSource() {
    sourceHash = normalizeHash(location.hash);
    sourceScrollY = window.scrollY;
    sourceState = Object.fromEntries(ids.map(id => {
      const el = get(id);
      return [id, el ? el.hidden : true];
    }));
    warmMountedImages();
  }

  function restoreSourceBehindDetail() {
    if (!sourceState) return;
    ids.forEach(id => {
      const el = get(id);
      if (el) el.hidden = sourceState[id];
    });
  }

  function enterOverlay() {
    body.classList.add('haki-ios-product-open');
    queueMicrotask(() => {
      restoreSourceBehindDetail();
      const detail = get('productDetail');
      if (detail) {
        detail.hidden = false;
        detail.scrollTop = 0;
      }
      warmMountedImages();
    });
  }

  function leaveOverlay() {
    body.classList.remove('haki-ios-product-open');
    queueMicrotask(() => {
      warmMountedImages();
      // app.js restores the exact listing scroll one frame later; this is only a fallback.
      if (sourceHash && normalizeHash(location.hash) === sourceHash) {
        requestAnimationFrame(() => {
          if (Math.abs(window.scrollY - sourceScrollY) > 4) {
            window.scrollTo({ top: sourceScrollY, behavior: 'instant' });
          }
        });
      }
      sourceState = null;
      sourceHash = '';
    });
  }

  // Capture before the hash changes. This includes catalog cards, new arrivals and recommendations.
  document.addEventListener('pointerdown', event => {
    const link = event.target.closest?.('a[href*="#producto/"]');
    if (link) captureSource();
  }, { capture:true, passive:true });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href*="#producto/"]');
    if (link && !sourceState) captureSource();
  }, true);

  window.addEventListener('hashchange', event => {
    const oldHash = hashFromUrl(event.oldURL);
    const newHash = hashFromUrl(event.newURL);
    const entering = !oldHash.startsWith('#producto/') && newHash.startsWith('#producto/');
    const leaving = oldHash.startsWith('#producto/') && !newHash.startsWith('#producto/');

    if (entering) {
      if (!sourceState) captureSource();
      enterOverlay();
    } else if (leaving) {
      leaveOverlay();
    }
  }, true);

  // Native lazy-loading has had iOS/WebKit regressions. Keep already-decoded images out of
  // the lazy observer so a swipe-back repaint does not temporarily blank them.
  const observer = new MutationObserver(() => warmMountedImages());
  ['products', 'newProducts'].forEach(id => {
    const el = get(id);
    if (el) observer.observe(el, { childList:true, subtree:true });
  });
  warmMountedImages();
})();
