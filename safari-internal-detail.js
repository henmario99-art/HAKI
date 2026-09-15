// iPhone/WebKit navigation stabilization for HAKI.
// Categories and product detail are real in-page layers. We intercept WebKit's
// left-edge history swipe and reproduce it with live DOM surfaces, so Safari and
// Chrome never expose stale/blank browser snapshots during catalog navigation.
(() => {
  const isIOSWebKit = window.hakiIOSWebKit === true;
  if (!isIOSWebKit) return;

  if (/\/product(?:\.html)?\/?$/.test(location.pathname)) {
    const target = new URL('/', location.origin);
    target.hash = location.hash || '#top';
    location.replace(target.href);
    return;
  }

  const root = document.documentElement;
  root.classList.add('haki-ios-layered-navigation');

  const style = document.createElement('style');
  style.id = 'haki-ios-layered-navigation-style';
  style.textContent = `
    html.haki-ios-layered-navigation{
      --haki-ios-bottom-ui:0px;
      --haki-ios-visual-height:100dvh;
      --haki-ios-category-top:0px;
      scroll-padding-bottom:calc(var(--haki-ios-bottom-ui) + env(safe-area-inset-bottom));
    }

    html.haki-ios-layered-navigation body.haki-ios-product-open #productDetail{
      will-change:transform;
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
      transform:translate3d(0,0,0);
      bottom:var(--haki-ios-bottom-ui)!important;
      max-height:var(--haki-ios-visual-height);
    }
    html.haki-ios-layered-navigation body.haki-ios-product-open #productDetail .detail-back{
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

    html.haki-ios-layered-navigation body.haki-ios-category-open{
      overflow:hidden!important;
      overscroll-behavior:none!important;
    }
    html.haki-ios-layered-navigation body.haki-ios-category-open #homeHero[hidden]{
      display:grid!important;
    }
    html.haki-ios-layered-navigation body.haki-ios-category-open #novedades[hidden],
    html.haki-ios-layered-navigation body.haki-ios-category-open #collectionsSection[hidden]{
      display:block!important;
    }
    html.haki-ios-layered-navigation body.haki-ios-category-open #catalogo{
      display:block!important;
      position:fixed!important;
      top:var(--haki-ios-category-top)!important;
      left:0!important;
      right:0!important;
      bottom:var(--haki-ios-bottom-ui)!important;
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
      transform:translate3d(0,0,0);
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
      will-change:transform;
    }
    html.haki-ios-layered-navigation body.haki-ios-category-open.haki-ios-product-open #catalogo{
      pointer-events:none;
    }

    html.haki-ios-layered-navigation body.haki-edge-back-active{
      overflow:hidden!important;
      touch-action:none!important;
    }

    #hakiIOSBottomGuard{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      height:max(var(--haki-ios-bottom-ui), env(safe-area-inset-bottom));
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
    :root[data-theme='oscuro'] #hakiIOSBottomGuard{
      background:var(--surface,#111);
    }
    body.haki-edge-back-active #hakiIOSBottomGuard,
    body.haki-ios-return-settling #hakiIOSBottomGuard{
      opacity:1;
    }

    @media (prefers-reduced-motion:reduce){
      html.haki-ios-layered-navigation #catalogo,
      html.haki-ios-layered-navigation #productDetail{
        transition:none!important;
      }
    }
  `;
  document.head.appendChild(style);

  const bottomGuard = document.createElement('div');
  bottomGuard.id = 'hakiIOSBottomGuard';
  bottomGuard.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bottomGuard);

  const EDGE = 36;
  const COMMIT_RATIO = 0.23;
  const FAST_VELOCITY = 0.46;
  const EXIT_MS = 165;
  const positions = new Map();

  let categoryLayer = null;
  let lastCategoryParentY = 0;
  let gesture = null;
  let finishing = false;
  let settleTimer = 0;
  let clickedCategory = false;

  const detail = () => document.getElementById('productDetail');
  const catalog = () => document.getElementById('catalogo');
  const detailOpen = () =>
    document.body.classList.contains('haki-ios-product-open') && !detail()?.hidden;
  const categoryHash = hash => /^#(?:coleccion|categoria)\//.test(hash || '');
  const categoryOpen = () =>
    categoryHash(location.hash) && document.body.classList.contains('haki-ios-category-open');
  const entryKey = () =>
    history.state?.hakiNavigation?.key || `${location.pathname}${location.hash || '#top'}`;

  const syncVisualViewport = () => {
    const vv = window.visualViewport;
    const layoutHeight = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );
    const visualHeight = vv?.height || window.innerHeight || layoutHeight;
    const visualTop = vv?.offsetTop || 0;
    const bottomUI = Math.max(0, layoutHeight - (visualTop + visualHeight));

    root.style.setProperty('--haki-ios-bottom-ui', `${Math.ceil(bottomUI)}px`);
    root.style.setProperty('--haki-ios-visual-height', `${Math.ceil(visualHeight)}px`);

    if (document.body.classList.contains('haki-ios-category-open')) {
      const header = document.querySelector('.header');
      const headerBottom = header?.getBoundingClientRect().bottom || visualTop;
      root.style.setProperty(
        '--haki-ios-category-top',
        `${Math.ceil(Math.max(visualTop, headerBottom))}px`
      );
    }
  };

  const beginViewportSettling = (duration = 220) => {
    clearTimeout(settleTimer);
    syncVisualViewport();
    document.body.classList.add('haki-ios-return-settling');
    settleTimer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        syncVisualViewport();
        document.body.classList.remove('haki-ios-return-settling');
      });
    }, duration);
  };

  const saveCategoryPosition = () => {
    if (!categoryLayer) return;
    const node = catalog();
    const saved = {
      parentY: categoryLayer.parentY,
      scrollTop: node?.scrollTop || 0
    };
    categoryLayer.scrollTop = saved.scrollTop;
    positions.set(categoryLayer.key || entryKey(), saved);
  };

  const openCategoryLayer = ({ parentY, scrollTop } = {}) => {
    const node = catalog();
    if (!node) return;

    const key = entryKey();
    const remembered = positions.get(key);
    const baseY = Math.max(
      0,
      Number.isFinite(parentY)
        ? parentY
        : Number.isFinite(remembered?.parentY)
          ? remembered.parentY
          : lastCategoryParentY || window.scrollY
    );
    const listY = Math.max(
      0,
      Number.isFinite(scrollTop)
        ? scrollTop
        : Number.isFinite(remembered?.scrollTop)
          ? remembered.scrollTop
          : 0
    );

    if (!categoryLayer) {
      categoryLayer = { key, parentY: baseY, scrollTop: listY };
      lastCategoryParentY = baseY;
      document.body.classList.add('haki-ios-category-open');
    } else {
      categoryLayer.key = key;
      categoryLayer.parentY = baseY;
      categoryLayer.scrollTop = listY;
    }

    syncVisualViewport();
    window.scrollTo({ top: baseY, left: 0, behavior: 'instant' });
    node.style.transition = '';
    node.style.transform = 'translate3d(0,0,0)';
    node.style.boxShadow = '';
    node.scrollTop = listY;
  };

  const closeCategoryLayer = () => {
    const node = catalog();
    if (categoryLayer) {
      saveCategoryPosition();
      lastCategoryParentY = categoryLayer.parentY;
    }
    const baseY = categoryLayer?.parentY ?? lastCategoryParentY ?? window.scrollY;
    categoryLayer = null;

    document.body.classList.remove('haki-ios-category-open');
    root.style.removeProperty('--haki-ios-category-top');

    if (node) {
      node.style.transition = '';
      node.style.transform = '';
      node.style.boxShadow = '';
      node.scrollTop = 0;
    }
    window.scrollTo({ top: Math.max(0, baseY), left: 0, behavior: 'instant' });
  };

  const clearSurfaceStyles = surface => {
    if (!surface) return;
    surface.style.transition = '';
    surface.style.transform = '';
    surface.style.boxShadow = '';
  };

  const clearGestureState = () => {
    document.body.classList.remove('haki-edge-back-active');
    clearSurfaceStyles(detail());
    if (categoryOpen()) {
      const node = catalog();
      if (node) node.style.transform = 'translate3d(0,0,0)';
      if (node) node.style.boxShadow = '';
      if (node) node.style.transition = '';
    }
  };

  const activeSurface = () => {
    if (detailOpen()) return { type: 'detail', node: detail() };
    if (categoryOpen()) return { type: 'category', node: catalog() };
    return null;
  };

  const fallbackDestination = type => {
    if (type === 'category') {
      const back = document.querySelector('#catalogo .back-home');
      return back ? new URL(back.href, location.href) : new URL('#top', location.href);
    }
    const back = detail()?.querySelector('.detail-back');
    return back ? new URL(back.href, location.href) : new URL('#catalogo', location.href);
  };

  const navigateWithoutExternalHistory = type => {
    const destination = fallbackDestination(type);
    const oldURL = location.href;
    history.replaceState(history.state, '', destination.href);
    let event;
    try {
      event = new HashChangeEvent('hashchange', { oldURL, newURL: destination.href });
    } catch {
      event = new Event('hashchange');
    }
    window.dispatchEvent(event);
  };

  const completeBack = type => {
    const hasParent = !!history.state?.hakiNavigation?.parent;
    if (hasParent) history.back();
    else navigateWithoutExternalHistory(type);
  };

  const finishBack = (surface = activeSurface()) => {
    if (finishing || !surface?.node) return;
    finishing = true;

    if (surface.type === 'category') saveCategoryPosition();

    const node = surface.node;
    const width = Math.max(window.innerWidth, node.getBoundingClientRect().width || 0);
    node.style.transition = `transform ${EXIT_MS}ms cubic-bezier(.22,.78,.24,1)`;
    node.style.transform = `translate3d(${width}px,0,0)`;
    node.style.boxShadow = '-16px 0 32px rgba(0,0,0,.10)';
    beginViewportSettling(EXIT_MS + 90);

    window.setTimeout(() => {
      completeBack(surface.type);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        clearGestureState();
        finishing = false;
      }));
    }, EXIT_MS);
  };

  const cancelBack = surface => {
    if (!surface?.node) {
      clearGestureState();
      return;
    }
    surface.node.style.transition = 'transform 180ms cubic-bezier(.22,.78,.24,1)';
    surface.node.style.transform = 'translate3d(0,0,0)';
    surface.node.style.boxShadow = '';
    window.setTimeout(clearGestureState, 190);
  };

  syncVisualViewport();
  window.visualViewport?.addEventListener('resize', syncVisualViewport, { passive:true });
  window.visualViewport?.addEventListener('scroll', syncVisualViewport, { passive:true });
  window.addEventListener('resize', syncVisualViewport, { passive:true });
  window.addEventListener('orientationchange', () => requestAnimationFrame(syncVisualViewport), { passive:true });
  window.addEventListener('pageshow', () => requestAnimationFrame(syncVisualViewport));

  document.addEventListener('click', event => {
    if (
      event.defaultPrevented ||
      event.button > 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) return;

    const link = event.target.closest?.('a[href]');
    if (!link) return;

    let destination;
    try { destination = new URL(link.href, location.href); } catch { return; }
    if (
      destination.origin !== location.origin ||
      destination.pathname !== location.pathname ||
      destination.search !== location.search
    ) return;

    if (categoryHash(destination.hash) && !detailOpen()) {
      const changing = destination.hash !== location.hash;
      if (!categoryOpen()) {
        openCategoryLayer({ parentY: window.scrollY, scrollTop: 0 });
      }
      clickedCategory = changing;
    }

    if (categoryOpen() && destination.hash.startsWith('#producto/')) {
      saveCategoryPosition();
    }
  }, true);

  document.addEventListener('click', () => {
    if (categoryHash(location.hash) && document.body.classList.contains('haki-ios-category-open')) {
      const remembered = positions.get(entryKey());
      const parentY = categoryLayer?.parentY ?? remembered?.parentY ?? lastCategoryParentY;
      const scrollTop = clickedCategory ? 0 : (remembered?.scrollTop ?? categoryLayer?.scrollTop ?? 0);
      openCategoryLayer({ parentY, scrollTop });
      positions.set(entryKey(), { parentY: categoryLayer.parentY, scrollTop: catalog()?.scrollTop || 0 });
    }
    clickedCategory = false;
  });

  window.addEventListener('touchstart', event => {
    if (finishing || event.touches.length !== 1) return;
    const surface = activeSurface();
    if (!surface?.node) return;

    const touch = event.touches[0];
    if (touch.clientX > EDGE) return;

    event.preventDefault();
    syncVisualViewport();

    const now = performance.now();
    gesture = {
      surface,
      startX: touch.clientX,
      startY: touch.clientY,
      x: touch.clientX,
      y: touch.clientY,
      lastX: touch.clientX,
      lastT: now,
      velocity: 0,
      horizontal: false
    };

    surface.node.style.transition = 'none';
    surface.node.style.transform = 'translate3d(0,0,0)';
    surface.node.style.boxShadow = '';
    document.body.classList.add('haki-edge-back-active');
  }, { capture:true, passive:false });

  window.addEventListener('touchmove', event => {
    if (!gesture || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const dx = Math.max(0, touch.clientX - gesture.startX);
    const dy = touch.clientY - gesture.startY;

    if (
      !gesture.horizontal &&
      dx > 6 &&
      Math.abs(dx) >= Math.abs(dy) * 0.72
    ) {
      gesture.horizontal = true;
    }

    if (!gesture.horizontal) return;
    event.preventDefault();

    const now = performance.now();
    const dt = Math.max(1, now - gesture.lastT);
    gesture.velocity = (touch.clientX - gesture.lastX) / dt;
    gesture.lastX = touch.clientX;
    gesture.lastT = now;
    gesture.x = touch.clientX;
    gesture.y = touch.clientY;

    const width = Math.max(1, window.innerWidth);
    const eased = Math.min(width, dx);
    gesture.surface.node.style.transform = `translate3d(${eased}px,0,0)`;
    gesture.surface.node.style.boxShadow =
      eased > 4 ? '-16px 0 32px rgba(0,0,0,.10)' : '';
  }, { capture:true, passive:false });

  const endGesture = cancelled => {
    if (!gesture) return;
    const current = gesture;
    gesture = null;

    if (cancelled || !current.horizontal) {
      cancelBack(current.surface);
      return;
    }

    const distance = Math.max(0, current.x - current.startX);
    const shouldCommit =
      distance >= window.innerWidth * COMMIT_RATIO ||
      current.velocity >= FAST_VELOCITY;

    if (shouldCommit) finishBack(current.surface);
    else cancelBack(current.surface);
  };

  window.addEventListener('touchend', () => endGesture(false), { capture:true, passive:false });
  window.addEventListener('touchcancel', () => endGesture(true), { capture:true, passive:false });

  document.addEventListener('click', event => {
    if (
      event.defaultPrevented ||
      event.button > 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) return;

    const back = event.target.closest?.('#productDetail .detail-back, #catalogo .back-home');
    const surface = activeSurface();
    if (!back || !surface) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    finishBack(surface);
  }, true);

  const afterHistoryRoute = () => {
    gesture = null;
    finishing = false;
    beginViewportSettling(180);

    if (categoryHash(location.hash)) {
      const remembered = positions.get(entryKey());
      openCategoryLayer({
        parentY: remembered?.parentY ?? lastCategoryParentY ?? window.scrollY,
        scrollTop: remembered?.scrollTop ?? 0
      });
    } else if (!location.hash.startsWith('#producto/') && categoryLayer) {
      closeCategoryLayer();
    }

    clearGestureState();
  };

  window.addEventListener('popstate', afterHistoryRoute);
  window.addEventListener('hashchange', afterHistoryRoute);

  if (categoryHash(location.hash)) {
    requestAnimationFrame(() => {
      openCategoryLayer({ parentY: window.scrollY, scrollTop: 0 });
      positions.set(entryKey(), {
        parentY: categoryLayer?.parentY || 0,
        scrollTop: catalog()?.scrollTop || 0
      });
    });
  }
})();
