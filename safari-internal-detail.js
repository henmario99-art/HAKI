// HAKI Safari navigation guard.
// Categories stay in normal document flow. We suppress WebKit's interactive
// history screenshot at the left edge and use programmatic history traversal,
// which lets app.js restore the exact category entry and scroll position.
(() => {
  if (window.hakiIOSWebKit !== true) return;

  if (/\/product(?:\.html)?\/?$/.test(location.pathname)) {
    const target = new URL('/', location.origin);
    target.hash = location.hash || '#top';
    location.replace(target.href);
    return;
  }

  const EDGE = 28;
  const COMMIT_DISTANCE = 72;
  const COMMIT_RATIO = 0.18;
  const FAST_VELOCITY = 0.5;

  let gesture = null;
  let pendingParent = null;

  const isCategoryHash = hash => /^#(?:coleccion|categoria)\//.test(hash || '');
  const isCategory = () => isCategoryHash(location.hash);
  const isDetail = () =>
    location.hash.startsWith('#producto/') &&
    document.body.classList.contains('haki-ios-product-open');

  const activeView = () => {
    if (isDetail()) return 'detail';
    if (isCategory()) return 'category';
    return null;
  };

  const destinationFor = type => {
    if (type === 'detail') {
      const back = document.querySelector('#productDetail .detail-back');
      return back ? new URL(back.href, location.href) : new URL('#catalogo', location.href);
    }
    const back = document.querySelector('#catalogo .back-home');
    return back ? new URL(back.href, location.href) : new URL('#top', location.href);
  };

  const replaceTo = destination => {
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

  const navigateBack = type => {
    const destination = destinationFor(type);
    const parent = history.state?.hakiSafariParent;

    // When the view was opened from inside HAKI, traverse to the real parent
    // history entry. Because the native gesture was cancelled, Safari performs
    // no screenshot slide; app.js gets the original navigation key and restores
    // the exact saved list/scroll position.
    if (parent && parent === destination.hash) {
      history.back();
      return;
    }

    // Direct/deep links have no in-app parent. Stay inside HAKI rather than
    // accidentally leaving the site.
    replaceTo(destination);
  };

  // Mark the parent hash before a normal internal category/product link creates
  // its new history entry. After hashchange we attach that relationship to the
  // new entry without changing the URL.
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

    const targetIsCategory = isCategoryHash(destination.hash);
    const targetIsProduct = destination.hash.startsWith('#producto/');
    if (!targetIsCategory && !targetIsProduct) return;
    if (destination.hash === location.hash) return;

    pendingParent = {
      target: destination.hash,
      parent: location.hash || '#top'
    };
  }, true);

  window.addEventListener('hashchange', () => {
    if (!pendingParent || pendingParent.target !== location.hash) return;
    history.replaceState(
      { ...history.state, hakiSafariParent: pendingParent.parent },
      '',
      location.href
    );
    pendingParent = null;
  });

  window.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    const type = activeView();
    if (!type) return;

    const touch = event.touches[0];
    if (touch.clientX > EDGE) return;

    // Cancel Safari's browser-level interactive history preview at its source.
    event.preventDefault();
    const now = performance.now();
    gesture = {
      type,
      startX: touch.clientX,
      startY: touch.clientY,
      x: touch.clientX,
      y: touch.clientY,
      lastX: touch.clientX,
      lastT: now,
      velocity: 0,
      horizontal: false
    };
  }, { capture:true, passive:false });

  window.addEventListener('touchmove', event => {
    if (!gesture || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const dx = Math.max(0, touch.clientX - gesture.startX);
    const dy = touch.clientY - gesture.startY;

    if (!gesture.horizontal && dx > 7 && Math.abs(dx) > Math.abs(dy) * 0.9) {
      gesture.horizontal = true;
    }
    if (gesture.horizontal) event.preventDefault();

    const now = performance.now();
    const dt = Math.max(1, now - gesture.lastT);
    gesture.velocity = (touch.clientX - gesture.lastX) / dt;
    gesture.lastX = touch.clientX;
    gesture.lastT = now;
    gesture.x = touch.clientX;
    gesture.y = touch.clientY;
  }, { capture:true, passive:false });

  const endGesture = cancelled => {
    if (!gesture) return;
    const current = gesture;
    gesture = null;
    if (cancelled || !current.horizontal) return;

    const distance = Math.max(0, current.x - current.startX);
    const shouldGoBack =
      distance >= Math.max(COMMIT_DISTANCE, window.innerWidth * COMMIT_RATIO) ||
      current.velocity >= FAST_VELOCITY;

    if (shouldGoBack) navigateBack(current.type);
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
    if (!back) return;

    const type = back.closest('#productDetail') ? 'detail' : (isCategory() ? 'category' : null);
    if (!type) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    navigateBack(type);
  }, true);
})();
