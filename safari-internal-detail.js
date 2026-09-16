// HAKI Safari navigation guard.
// The old implementation turned categories into fixed compositor layers and
// animated those layers manually. That caused duplicated grids, top gaps and
// bottom-to-top repaints in iOS Safari. Categories now stay in normal document
// flow. This file only suppresses Safari's problematic edge-history preview and
// performs a direct in-app Back action for category/product views.
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

  const isCategory = () => /^#(?:coleccion|categoria)\//.test(location.hash || '');
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

  const navigateBack = type => {
    const destination = destinationFor(type);

    // We intentionally replace the current hash instead of allowing Safari to
    // display its cached interactive history screenshot. app.js receives a
    // synthetic hashchange and restores the correct list/scroll synchronously.
    const oldURL = location.href;
    history.replaceState(history.state, '', destination.href);

    let event;
    try {
      event = new HashChangeEvent('hashchange', {
        oldURL,
        newURL: destination.href
      });
    } catch {
      event = new Event('hashchange');
    }
    window.dispatchEvent(event);
  };

  window.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    const type = activeView();
    if (!type) return;

    const touch = event.touches[0];
    if (touch.clientX > EDGE) return;

    // Prevent WebKit from starting its browser-level history snapshot gesture.
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

  // Use the same direct navigation for visible Back controls. No surface
  // animation is performed; the existing category/product DOM is revealed in
  // one frame, preserving already decoded images and the saved scroll position.
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
