// HAKI Safari navigation stabilizer.
// app.js remains the owner of navigation history and exact scroll restoration.
// This module only does two iOS/WebKit-specific jobs:
// 1) suppress Safari's native edge-history screenshot gesture; and
// 2) make category <-> parent changes atomic with the View Transition API so
//    WebKit never exposes the one-frame DOM replacement seen as a flicker.
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
  let transitionRunning = false;

  const isCategoryHash = hash => /^#(?:coleccion|categoria)\//.test(hash || '');
  const isCategory = () => isCategoryHash(location.hash);
  const isDetail = () =>
    location.hash.startsWith('#producto/') &&
    document.body.classList.contains('haki-ios-product-open');

  // Keep the HAKI header outside the content cross-fade. This is deliberately
  // injected only on iOS/WebKit so desktop/Android rendering is unchanged.
  const transitionStyle = document.createElement('style');
  transitionStyle.id = 'haki-safari-category-transition-style';
  transitionStyle.textContent = `
    @supports (view-transition-name: none) {
      html.haki-ios-webkit .announcement{view-transition-name:haki-announcement}
      html.haki-ios-webkit .header{view-transition-name:haki-header}

      ::view-transition-group(haki-announcement),
      ::view-transition-group(haki-header){
        animation-duration:1ms;
      }

      ::view-transition-old(root){
        animation:haki-category-old 95ms cubic-bezier(.22,.72,.2,1) both;
      }
      ::view-transition-new(root){
        animation:haki-category-new 115ms cubic-bezier(.22,.72,.2,1) both;
      }

      @keyframes haki-category-old{
        from{opacity:1}
        to{opacity:.10}
      }
      @keyframes haki-category-new{
        from{opacity:.10}
        to{opacity:1}
      }

      @media (prefers-reduced-motion:reduce){
        ::view-transition-old(root),
        ::view-transition-new(root){animation-duration:1ms!important}
      }
    }
  `;
  document.head.appendChild(transitionStyle);

  const dispatchRoute = () => {
    let event;
    try {
      event = new PopStateEvent('popstate', { state: history.state });
    } catch {
      event = new Event('popstate');
    }
    window.dispatchEvent(event);
  };

  const pushCategoryEntry = destination => {
    const source = history.state?.hakiNavigation;
    // app.js keys listing snapshots/scroll positions by navigation-entry key.
    // A category entry created here follows exactly the same state contract.
    const key = `haki-vt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    history.pushState({
      ...history.state,
      hakiNavigation: {
        key,
        hash: destination.hash,
        parent: source?.key || null
      }
    }, '', destination.href);
    dispatchRoute();
  };

  const runAtomicUpdate = update => {
    if (transitionRunning || typeof document.startViewTransition !== 'function') {
      update();
      return;
    }
    transitionRunning = true;
    const transition = document.startViewTransition(() => {
      update();
    });
    transition.finished.finally(() => {
      transitionRunning = false;
    });
  };

  const runHistoryBackTransition = () => {
    if (!history.state?.hakiNavigation?.parent) return false;

    if (transitionRunning || typeof document.startViewTransition !== 'function') {
      history.back();
      return true;
    }

    transitionRunning = true;
    const transition = document.startViewTransition(() => new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('popstate', onRoute);
        window.removeEventListener('hashchange', onRoute);
        resolve();
      };
      const onRoute = () => queueMicrotask(finish);
      window.addEventListener('popstate', onRoute, { once:true });
      window.addEventListener('hashchange', onRoute, { once:true });
      history.back();
      // Defensive fallback for an unusual WebKit history failure.
      window.setTimeout(finish, 450);
    }));
    transition.finished.finally(() => {
      transitionRunning = false;
    });
    return true;
  };

  // Intercept only category navigation in capture phase. Product links are
  // intentionally untouched because their current navigation already behaves
  // correctly. app.js never receives these category clicks; instead we create
  // the same history-state shape and trigger its existing router ourselves.
  document.addEventListener('click', event => {
    if (
      event.defaultPrevented ||
      event.button > 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) return;

    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

    let destination;
    try { destination = new URL(link.href, location.href); } catch { return; }
    if (
      destination.origin !== location.origin ||
      destination.pathname !== location.pathname ||
      destination.search !== location.search
    ) return;

    const enteringCategory = isCategoryHash(destination.hash);
    const leavingCategory = isCategory() && link.matches('#catalogo .back-home');
    if (!enteringCategory && !leavingCategory) return;
    if (destination.hash === location.hash) return;

    // If View Transitions are unavailable, leave the proven app.js path alone.
    if (typeof document.startViewTransition !== 'function') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (leavingCategory && runHistoryBackTransition()) return;

    runAtomicUpdate(() => pushCategoryEntry(destination));
  }, true);

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
    if (history.state?.hakiNavigation?.parent) {
      // Categories use the atomic transition; products keep the already-correct
      // immediate history behavior.
      if (type === 'category' && runHistoryBackTransition()) return;
      history.back();
      return;
    }

    // Direct/deep links have no in-app parent. Keep the fallback inside HAKI.
    const destination = fallbackDestination(type);
    if (destination.hash === location.hash) return;
    if (type === 'category' && typeof document.startViewTransition === 'function') {
      runAtomicUpdate(() => {
        history.replaceState(history.state, '', destination.href);
        dispatchRoute();
      });
    } else {
      location.hash = destination.hash;
    }
  };

  window.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    const type = activeView();
    if (!type) return;

    const touch = event.touches[0];
    if (touch.clientX > EDGE) return;

    // Prevent WebKit from starting its native screenshot/slide transition.
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
})();
