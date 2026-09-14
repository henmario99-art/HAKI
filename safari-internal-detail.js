// Safari-only iPhone product navigation stabilization.
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
  };

  syncVisualViewport();
  window.visualViewport?.addEventListener('resize', syncVisualViewport, { passive:true });
  window.visualViewport?.addEventListener('scroll', syncVisualViewport, { passive:true });
  window.addEventListener('resize', syncVisualViewport, { passive:true });
  window.addEventListener('orientationchange', () => requestAnimationFrame(syncVisualViewport), { passive:true });
  window.addEventListener('pageshow', () => requestAnimationFrame(syncVisualViewport));

  const EDGE = 34;
  const COMMIT_RATIO = 0.24;
  const FAST_VELOCITY = 0.48;
  let openedFromCatalogue = false;
  let gesture = null;
  let finishing = false;
  let settleTimer = 0;

  const detail = () => document.getElementById('productDetail');
  const detailOpen = () => document.body.classList.contains('haki-ios-product-open') && !detail()?.hidden;

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

  // This runs before app.js's bubble listener. We do not cancel the click: app.js
  // still creates the normal pushState entry, so Safari's toolbar Back remains valid.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    let destination;
    try { destination = new URL(link.href, location.href); } catch { return; }
    if (destination.origin !== location.origin || destination.pathname !== location.pathname || destination.search !== location.search) return;
    if (!detailOpen() && destination.hash.startsWith('#producto/')) openedFromCatalogue = true;
  }, true);

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
    const back = panel?.querySelector('.detail-back');
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
    const panel = detail();
    if (!panel) {
      finishing = false;
      return;
    }
    syncVisualViewport();
    const width = Math.max(window.innerWidth, panel.getBoundingClientRect().width || 0);
    panel.style.transition = 'transform 170ms cubic-bezier(.22,.78,.24,1)';
    panel.style.transform = `translate3d(${width}px,0,0)`;
    panel.style.boxShadow = '-16px 0 32px rgba(0,0,0,.10)';

    window.setTimeout(() => {
      // Keep a neutral strip over Safari's transient bottom viewport while WebKit
      // settles the toolbar. This prevents the retired PDP image from flashing there.
      beginViewportSettling(280);
      if (openedFromCatalogue) history.back();
      else closeWithoutExternalHistory();
      // app.js handles the real view change. Reset only after that has had a frame.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        clearVisualState();
        finishing = false;
        openedFromCatalogue = false;
      }));
    }, 165);
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
  // cancelling touchstart is the reliable way to keep that gesture inside the page.
  // We then reproduce the same left-to-right interaction on the product sheet.
  window.addEventListener('touchstart', event => {
    if (!detailOpen() || finishing || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (touch.clientX > EDGE) return;

    event.preventDefault();
    syncVisualViewport();
    const now = performance.now();
    gesture = {
      startX: touch.clientX,
      startY: touch.clientY,
      x: touch.clientX,
      y: touch.clientY,
      lastX: touch.clientX,
      lastT: now,
      velocity: 0,
      horizontal: false
    };
    const panel = detail();
    panel.style.transition = 'none';
    panel.style.transform = 'translate3d(0,0,0)';
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

    const panel = detail();
    const width = Math.max(1, window.innerWidth);
    const eased = Math.min(width, dx);
    panel.style.transform = `translate3d(${eased}px,0,0)`;
    panel.style.boxShadow = eased > 4 ? '-16px 0 32px rgba(0,0,0,.10)' : '';
  }, { capture:true, passive:false });

  const endGesture = () => {
    if (!gesture) return;
    const panel = detail();
    const rect = panel?.getBoundingClientRect();
    const distance = rect ? Math.max(0, rect.left) : Math.max(0, gesture.x - gesture.startX);
    const shouldCommit = gesture.horizontal &&
      (distance >= window.innerWidth * COMMIT_RATIO || gesture.velocity >= FAST_VELOCITY);
    gesture = null;
    if (shouldCommit) finishBack();
    else cancelBack();
  };

  window.addEventListener('touchend', endGesture, { capture:true, passive:false });
  window.addEventListener('touchcancel', endGesture, { capture:true, passive:false });

  // The visible Back control uses the same controlled transition. No WebKit snapshot.
  document.addEventListener('click', event => {
    const back = event.target.closest?.('#productDetail .detail-back');
    if (!back || !detailOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finishBack();
  }, true);

  // Safari toolbar Back/Forward can still operate normally. Keep the bottom safe
  // area masked briefly while the visual viewport expands/collapses after history.
  window.addEventListener('popstate', () => {
    gesture = null;
    finishing = false;
    beginViewportSettling(280);
    clearVisualState();
    if (!location.hash.startsWith('#producto/')) openedFromCatalogue = false;
  });
})();
