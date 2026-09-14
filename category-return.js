// Keep category navigation stable in every browser.
// The app router owns which sections are visible. This file runs after app.js and
// only restores the exact scroll position once the source view is visible again.
(() => {
  const STORAGE_KEY = 'haki:category-return-v1';
  const isFilteredCategory = hash => /^#(?:coleccion|categoria)\//.test(hash || '');

  const readReturn = () => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  };

  const writeReturn = value => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
    catch {}
  };

  const normalizedHash = hash => (!hash || hash === '#top') ? '' : hash;

  const isSavedSource = saved => {
    if (!saved?.href || !Number.isFinite(saved.y)) return false;
    try {
      const source = new URL(saved.href, location.href);
      return source.origin === location.origin &&
        source.pathname === location.pathname &&
        source.search === location.search &&
        normalizedHash(source.hash) === normalizedHash(location.hash);
    } catch {
      return false;
    }
  };

  const restoreWhenReady = saved => {
    if (!isSavedSource(saved)) return;
    let attempts = 0;
    const restore = () => {
      attempts += 1;
      const collections = document.getElementById('collectionsSection');
      const homeVisible = collections && !collections.hidden && !document.body.classList.contains('collection-view');
      if (!homeVisible && attempts < 8) {
        requestAnimationFrame(restore);
        return;
      }
      if (!homeVisible) return;
      window.scrollTo({ top: Math.max(0, saved.y), left: 0, behavior: 'instant' });
    };
    requestAnimationFrame(() => requestAnimationFrame(restore));
  };

  // Save the exact viewport before the browser changes the hash. No rendering,
  // hiding, or scrolling happens here, so the normal router remains untouched.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    let destination;
    try { destination = new URL(link.href, location.href); }
    catch { return; }

    if (destination.origin !== location.origin || destination.pathname !== location.pathname || destination.search !== location.search) return;
    if (!isFilteredCategory(destination.hash) || isFilteredCategory(location.hash)) return;

    writeReturn({
      href: location.href,
      y: window.scrollY,
      time: Date.now()
    });
  }, true);

  // Inside a category, the existing “Volver” control should behave like browser
  // Back when the category was opened from this page. That preserves one clean
  // history traversal instead of creating an extra #top entry.
  document.addEventListener('click', event => {
    const back = event.target.closest?.('.back-home');
    if (!back || !isFilteredCategory(location.hash)) return;
    const saved = readReturn();
    if (!saved?.href) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    history.back();
  }, true);

  // app.js receives popstate first because this script loads after it. By the time
  // our restoration runs, Home + the category tiles have already been unhidden.
  window.addEventListener('popstate', () => {
    if (isFilteredCategory(location.hash)) return;
    restoreWhenReady(readReturn());
  });

  // Covers non-history hash changes back to the source without interfering with
  // the normal browser Back/Forward path.
  window.addEventListener('hashchange', () => {
    if (isFilteredCategory(location.hash)) return;
    restoreWhenReady(readReturn());
  });

  window.addEventListener('pageshow', event => {
    if (!event.persisted || isFilteredCategory(location.hash)) return;
    restoreWhenReady(readReturn());
  });
})();
