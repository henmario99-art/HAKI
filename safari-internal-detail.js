// HAKI Safari edge-swipe guard.
// app.js is the single owner of navigation history and exact scroll restoration.
// This file only suppresses Safari's problematic interactive screenshot gesture
// and converts a completed edge swipe into a normal history.back().
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

  const fallbackDestination = type => {
    if (type === 'detail') {
      const back = document.querySelector('#productDetail .detail-back');
      return back ? new URL(back.href, location.href) : new URL('#catalogo', location.href);
    }
    const back = document.querySelector('#catalogo .back-home');
    return back ? new URL(back.href, location.href) : new URL('#top', location.href);
  };

  const commitBack = type => {
    // Every internal HAKI navigation created by app.js stores the exact parent
    // entry key. Let the browser traverse that real entry; app.js will restore
    // the corresponding category/home state and exact scroll position.
    if (history.state?.hakiNavigation?.parent) {
      history.back();
      return;
    }

    // Direct/deep links do not have an in-app parent. Use the visible fallback
    // destination without installing a second navigation/history system.
    const destination = fallbackDestination(type);
    if (destination.hash === location.hash) return;
    location.hash = destination.hash;
  };

  window.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    const type = activeView();
    if (!type) return;

    const touch = event.touches[0];
    if (touch.clientX > EDGE) return;

    // Prevent WebKit from starting its native snapshot/slide transition.
    event.preventDefault();
    const now = performance.now();
    gesture = {
      type,
      startX: touch.clientX,
      startY: touch.clientY,
      x: touch.clientX,
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

    if (shouldGoBack) commitBack(current.type);
  };

  window.addEventListener('touchend', () => endGesture(false), { capture:true, passive:false });
  window.addEventListener('touchcancel', () => endGesture(true), { capture:true, passive:false });

  // Deliberately do NOT intercept .detail-back or .back-home clicks here.
  // app.js handles those links and owns the parent-entry/scroll restoration.
})();
