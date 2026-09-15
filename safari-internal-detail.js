// Safari-only iPhone product and category navigation stabilization.
// Keep HAKI's normal product history entry, but take control of the left-edge
// back gesture so WebKit never starts its buggy interactive history snapshot.
(() => {
  const ua = navigator.userAgent || '';
  const isIOSWebKit = window.hakiIOSWebKit === true;
  const isSafari = isIOSWebKit && /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(ua);
  if (!isSafari) return;

  // Recover cleanly from the separate /product route used by the previous test.
  // No new navigation will use that route after this version.
  if (/\/product(?:\.html)?\/?$/.test(location.pathname)) {
    const target = new URL('/', location.origin);
    target.hash = location.hash || '#top';
    location.replace(target.href);
    return;
  }

  const root = document.documentElement;
  root.classList.add('haki-safari-custom-back');

  const style = document.createElement('style');
  style.id = 'haki-safari-custom-back-style';
  style.textContent = `
    html.haki-safari-custom-back{
      --haki-safari-bottom-ui:0px;
      --haki-safari-visual-height:100dvh;
      --haki-safari-category-top:0px;
      scroll-padding-bottom:calc(var(--haki-safari-bottom-ui) + env(safe-area-inset-bottom));
    }
    html.haki-safari-custom-back body.haki-ios-product-open #productDetail{
      will-change:transform;
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
      transform:translate3d(0,0,0);
      bottom:var(--haki-safari-bottom-ui)!important;
      max-height:var(--haki-safari-visual-height);
    }
    html.haki-safari-custom-back body.haki-ios-product-open #productDetail .detail-back{
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

    /* Safari-only category sheet.
       The page underneath is frozen at the exact source position while #catalogo
       becomes its own scroll layer, matching the already-stable product detail. */
    html.haki-safari-custom-back body.haki-safari-category-open{
      overflow:hidden!important;
      overscroll-behavior:none;
    }
    html.haki-safari-custom-back body.haki-safari-category-open #catalogo{
      display:block!important;
      position:fixed!important;
      top:var(--haki-safari-category-top)!important;
      left:0!important;
      right:0!important;
      bottom:var(--haki-safari-bottom-ui)!important;
      z-index:28!important;
      width:100%!important;
      max-width:none!important;
      height:auto!important;
      max-height:none!important;
      margin:0!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
      -webkit-overflow-scrolling:touch;
      overscroll-behavior-y:contain;
      background:var(--surface,#fff)!important;
      isolation:isolate;
      contain:paint;
      transform:translateZ(0);
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
    }
    html.haki-safari-custom-back body.haki-safari-category-open.haki-ios-product-open #catalogo{
      pointer-events:none;
    }

    html.haki-safari-custom-back body.haki-edge-back-active{
      overflow:hidden!important;
    }
    #hakiSafariBottomGuard{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      height:max(var(--haki-safari-bottom-ui), env(safe-area-inset-bottom));
      min-height:0;
      z-index:2147483000;
      pointer-events:none;
      background:var(--surface,#fff);
      opacity:0;
      transition:opacity 40ms linear;
      transform:translateZ(0);
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
    }
    :root[data-theme='oscuro'] #hakiSafariBottomGuard{
      background:var(--surface,#111);
    }
    body.haki-edge-back-active #hakiSafariBottomGuard,
    body.haki-safari-return-settling #hakiSafariBottomGuard{
      opacity:1;
    }
  `;
  document.head.appendChild(style);

  const bottomGuard = document.createElement('div');
  bottomGuard.id = 'hakiSafariBottomGuard';
  bottomGuard.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bottomGuard);

  const EDGE = 34;
  const COMMIT_RATIO = 0.24;
  const FAST_VELOCITY = 0.48;
  let openedFromCatalogue = false;
  let gesture = null;
  let finishing = false;
  let settleTimer = 0;
  let categoryLayer = null;
  let lastCategoryParentY = 0;
  let lastCategoryScrollTop = 0;
  let resetCategoryScrollAfterClick = false;

  const detail = () => document.getElementById('productDetail');
  const catalog = () => document.getElementById('catalogo');
  const detailOpen = () => document.body.classList.contains('haki-ios-product-open') && !detail()?.hidden;
  const categoryHash = hash => /^#(?:coleccion|categoria)\//.test(hash || '');
  const categoryOpen = () => !detailOpen() && categoryHash(location.hash);
  const categoryLayerActive = () => document.body.classList.contains('haki-safari-category-open');

  const updateCategoryGeometry = () => {
    if (!categoryLayerActive()) return;
    const header = document.querySelector('.header');
    const visualTop = window.visualViewport?.offsetTop || 0;
    const headerBottom = header?.getBoundingClientRect().bottom || visualTop;
    root.style.setProperty(
      '--haki-safari-category-top',
      `${Math.ceil(Math.max(visualTop, headerBottom))}px`
    );
  };

  const syncVisualViewport = () => {
    const vv = window.visualViewport;
    const layoutHeight = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );
    const visualHeight = vv?.height || window.innerHeight || layoutHeight;
    const visualTop = vv?.offsetTop || 0;
    const bottomUI = Math.max(0, layoutHeight - (visualTop + visualHeight));

    root.style.setProperty('--haki-safari-bottom-ui', `${Math.ceil(bottomUI)}px`);
    root.style.setProperty('--haki-safari-visual-height', `${Math.ceil(visualHeight)}px`);
    updateCategoryGeometry();
  };

  const openCategoryLayer = (parentY = window.scrollY) => {
    const node = catalog();
    if (!node) return;

    if (categoryLayer) {
      updateCategoryGeometry();
      return;
    }

    const body = document.body;
    const y = Math.max(0, Number.isFinite(parentY) ? parentY : window.scrollY);
    categoryLayer = {
      parentY: y,
      categoryScrollTop: lastCategoryScrollTop
    };
    lastCategoryParentY = y;

    body.classList.add('haki-safari-category-open');
    updateCategoryGeometry();

    // A newly opened category starts at its own top, without changing the page
    // scroll that is frozen underneath.
    node.scrollTop = 0;
  };

  const closeCategoryLayer = () => {
    if (!categoryLayer) {
      document.body.classList.remove('haki-safari-category-open');
      return;
    }

    const data = categoryLayer;
    const node = catalog();
    if (node) lastCategoryScrollTop = node.scrollTop;
    lastCategoryParentY = data.parentY;
    categoryLayer = null;

    document.body.classList.remove('haki-safari-category-open');
    root.style.removeProperty('--haki-safari-category-top');

    // Restore before the next paint. The home/catalog source never has to be
    // reconstructed visually after Safari has already exposed it.
    window.scrollTo({ top: data.parentY, left: 0, behavior: 'instant' });
    if (node) node.scrollTop = 0;
  };

  const restoreCategoryLayerScroll = () => {
    if (!categoryLayer || !categoryHash(location.hash)) return;
    const node = catalog();
    if (!node) return;
    updateCategoryGeometry();
    node.scrollTop = Math.max(0, categoryLayer.categoryScrollTop || lastCategoryScrollTop || 0);
  };

  syncVisualViewport();
  window.visualViewport?.addEventListener('resize', syncVisualViewport, { passive:true });
  window.visualViewport?.addEventListener('scroll', syncVisualViewport, { passive:true });
  window.addEventListener('resize', syncVisualViewport, { passive:true });
  window.addEventListener('orientationchange', () => requestAnimationFrame(syncVisualViewport), { passive:true });
  window.addEventListener('pageshow', () => requestAnimationFrame(syncVisualViewport));

  const beginViewportSettling = (duration = 260) => {
    clearTimeout(settleTimer);
    syncVisualViewport();
    document.body.classList.add('haki-safari-return-settling');
    settleTimer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        syncVisualViewport();
        document.body.classList.remove('haki-safari-return-settling');
      });
    }, duration);
  };

  // This runs before app.js's bubble listener. app.js still owns normal history,
  // while Safari gets a fixed category layer before any layout-changing route runs.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    let destination;
    try { destination = new URL(link.href, location.href); } catch { return; }
    if (destination.origin !== location.origin || destination.pathname !== location.pathname || destination.search !== location.search) return;

    if (!detailOpen() && categoryHash(destination.hash)) {
      if (!categoryLayerActive()) openCategoryLayer(window.scrollY);
      resetCategoryScrollAfterClick = destination.hash !== location.hash;
    }

    if (categoryHash(location.hash) && destination.hash.startsWith('#producto/')) {
      openedFromCatalogue = true;
      if (categoryLayer) categoryLayer.categoryScrollTop = catalog()?.scrollTop || 0;
    } else if (!detailOpen() && destination.hash.startsWith('#producto/')) {
      openedFromCatalogue = true;
    }
  }, true);

  // app.js's click router is registered earlier and runs first in bubble phase.
  // Finish the category-sheet bookkeeping in the same task, before Safari paints.
  document.addEventListener('click', () => {
    if (!categoryLayerActive() || !categoryHash(location.hash)) {
      resetCategoryScrollAfterClick = false;
      return;
    }
    updateCategoryGeometry();
    if (categoryLayer) {
      window.scrollTo({ top: categoryLayer.parentY, left: 0, behavior: 'instant' });
    }
    if (resetCategoryScrollAfterClick) {
      const node = catalog();
      if (node) node.scrollTop = 0;
      if (categoryLayer) categoryLayer.categoryScrollTop = 0;
    }
    resetCategoryScrollAfterClick = false;
  });

  const clearVisualState = () => {
    const panel = detail();
    document.body.classList.remove('haki-edge-back-active');
    if (!panel) return;
    panel.style.transition = '';
    panel.style.transform = '';
    panel.style.boxShadow = '';
  };

  const closeWithoutExternalHistory = () => {
    const panel = detail();
    const back = categoryOpen()
      ? document.querySelector('#catalogo .back-home')
      : panel?.querySelector('.detail-back');
    const destination = back ? new URL(back.href, location.href) : new URL('#top', location.href);
    const oldURL = location.href;
    history.replaceState(history.state, '', destination.href);
    let event;
    try { event = new HashChangeEvent('hashchange', { oldURL, newURL: destination.href }); }
    catch { event = new Event('hashchange'); }
    window.dispatchEvent(event);
  };

  const finishBack = () => {
    if (finishing) return;
    finishing = true;

    if (categoryOpen() && categoryLayer) {
      categoryLayer.categoryScrollTop = catalog()?.scrollTop || 0;
    }

    // Navigate immediately. The category itself is now a fixed layer, so its
    // height cannot make Safari collapse/expand the page during this history step.
    beginViewportSettling(180);
    if (history.state?.hakiNavigation?.parent || openedFromCatalogue) {
      history.back();
    } else {
      closeWithoutExternalHistory();
      clearVisualState();
      finishing = false;
    }
  };

  const cancelBack = () => {
    const panel = detail();
    if (!panel) return;
    panel.style.transition = 'transform 180ms cubic-bezier(.22,.78,.24,1)';
    panel.style.transform = 'translate3d(0,0,0)';
    panel.style.boxShadow = '';
    window.setTimeout(clearVisualState, 190);
  };

  // WebKit gives its browser-level Back gesture priority at the left edge. On iOS,
  // cancelling touchstart keeps that gesture inside the page without removing it:
  // HAKI reproduces the same interaction and commits normal browser history.
  window.addEventListener('touchstart', event => {
    if ((!detailOpen() && !categoryOpen()) || finishing || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (touch.clientX > EDGE) return;

    event.preventDefault();
    syncVisualViewport();
    const now = performance.now();
    gesture = {
      category: categoryOpen(),
      startX: touch.clientX,
      startY: touch.clientY,
      x: touch.clientX,
      y: touch.clientY,
      lastX: touch.clientX,
      lastT: now,
      velocity: 0,
      horizontal: false
    };
    if (!gesture.category) {
      const panel = detail();
      panel.style.transition = 'none';
      panel.style.transform = 'translate3d(0,0,0)';
    }
    document.body.classList.add('haki-edge-back-active');
  }, { capture:true, passive:false });

  window.addEventListener('touchmove', event => {
    if (!gesture || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    const dx = Math.max(0, touch.clientX - gesture.startX);
    const dy = touch.clientY - gesture.startY;
    const now = performance.now();
    const dt = Math.max(1, now - gesture.lastT);
    gesture.velocity = (touch.clientX - gesture.lastX) / dt;
    gesture.lastX = touch.clientX;
    gesture.lastT = now;
    gesture.x = touch.clientX;
    gesture.y = touch.clientY;

    if (!gesture.horizontal && dx > 6 && Math.abs(dx) >= Math.abs(dy) * 0.7) gesture.horizontal = true;
    if (!gesture.horizontal) return;
    // The category sheet remains visually intact until commit. Safari never gets
    // an opportunity to expose its stale history snapshot underneath it.
    if (gesture.category) return;

    const panel = detail();
    const width = Math.max(1, window.innerWidth);
    const eased = Math.min(width, dx);
    panel.style.transform = `translate3d(${eased}px,0,0)`;
    panel.style.boxShadow = eased > 4 ? '-16px 0 32px rgba(0,0,0,.10)' : '';
  }, { capture:true, passive:false });

  const endGesture = () => {
    if (!gesture) return;
    const category = gesture.category;
    const distance = Math.max(0, gesture.x - gesture.startX);
    const shouldCommit = gesture.horizontal &&
      (distance >= window.innerWidth * COMMIT_RATIO || gesture.velocity >= FAST_VELOCITY);
    gesture = null;
    if (shouldCommit) finishBack();
    else if (category) clearVisualState();
    else cancelBack();
  };

  window.addEventListener('touchend', endGesture, { capture:true, passive:false });
  window.addEventListener('touchcancel', () => {
    gesture = null;
    clearVisualState();
  }, { capture:true, passive:false });

  // The visible Back control uses the same controlled history transition.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const back = event.target.closest?.('#productDetail .detail-back, #catalogo .back-home');
    if (!back || (!detailOpen() && !categoryOpen())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finishBack();
  }, true);

  const afterHistoryRoute = () => {
    gesture = null;
    finishing = false;
    beginViewportSettling(180);
    clearVisualState();

    if (categoryHash(location.hash)) {
      if (!categoryLayerActive()) openCategoryLayer(lastCategoryParentY || window.scrollY);
      if (categoryLayer) {
        window.scrollTo({ top: categoryLayer.parentY, left: 0, behavior: 'instant' });
      }
      restoreCategoryLayerScroll();
    } else if (!location.hash.startsWith('#producto/') && categoryLayerActive()) {
      closeCategoryLayer();
    }

    if (!location.hash.startsWith('#producto/')) openedFromCatalogue = false;
  };

  // app.js registered both listeners first, so its route has already completed
  // when these run. All layer restoration therefore happens before the next paint.
  window.addEventListener('popstate', afterHistoryRoute);
  window.addEventListener('hashchange', afterHistoryRoute);

})();
