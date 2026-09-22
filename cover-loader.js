/* Start the live catalog and original cover before the storefront scripts load. */
(() => {
  const scriptURL = document.currentScript.src;
  const appPath = new URL('app/', new URL('./', scriptURL)).pathname;
  const installed = navigator.standalone === true ||
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: window-controls-overlay)').matches;
  // pwa-mode redirects to the matching storefront; do not fetch twice en route.
  if (installed !== location.pathname.startsWith(appPath)) return;
  const endpoint = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations?mode=public-catalog';
  const cacheKey = 'haki_cover_prefetch_v1';
  const warmed = new Map();

  function source(config, fallback = false) {
    const value = String((fallback ? config.portadaRespaldo :
      config.portadaOriginal || config.portadaDesktop || config.portada || config.portadaRespaldo) || '').trim();
    if (!value || /^(data:|blob:)/i.test(value)) return value;
    const url = new URL(value, new URL('./', scriptURL));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    // Only replacing the cover invalidates it; sales/catalog edits reuse its cache.
    if (config.portadaRevision) url.searchParams.set('v', config.portadaRevision);
    return url.href;
  }

  function warm(config) {
    if (config.tipoPortada === 'video') return;
    const url = source(config);
    if (!url || warmed.has(url)) return;
    const image = new Image();
    image.fetchPriority = 'high';
    image.decoding = 'async';
    image.src = url;
    warmed.set(url, image);
  }

  function paint(hero, config) {
    if (!hero) return;
    if (window.HAKI_COVER_WAITING_LIVE) {
      hero.removeAttribute('src');
      hero.removeAttribute('srcset');
      hero.style.visibility = 'hidden';
      return;
    }
    const url = source(config);
    hero.fetchPriority = 'high';
    hero.loading = 'eager';
    hero.decoding = 'async';
    // Preserve every original pixel, including when CSS crops the sides on mobile.
    hero.removeAttribute('srcset');
    hero.removeAttribute('sizes');
    hero.onerror = () => {
      hero.onerror = null;
      const backup = source(config, true);
      if (backup && backup !== url) hero.src = backup;
    };
    if (url && hero.getAttribute('src') !== url) hero.src = url;
    hero.style.visibility = url ? '' : 'hidden';
  }

  window.HAKI_COVER = { source, warm, paint };
  // Speculatively download the last verified image, but never display it until
  // the live catalog confirms the current cover (offline fallback is separate).
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached?.config) warm(cached.config);
  } catch {}

  let pending;
  window.HAKI_FETCH_CATALOG = () => {
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetch(endpoint, { cache:'no-store', signal:AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error('Catalog unavailable');
        const data = await response.json();
        if (!data?.config || typeof data.config !== 'object' || !Array.isArray(data.products) ||
            !data.products.every(p => p && typeof p.codigo === 'string' && typeof p.nombre === 'string')) return null;
        warm(data.config);
        const config = {};
        for (const field of ['portadaOriginal','portadaDesktop','portada','portadaRespaldo','portadaRevision','tipoPortada']) {
          if (data.config[field]) config[field] = data.config[field];
        }
        try { localStorage.setItem(cacheKey, JSON.stringify({ config })); } catch {}
        return data;
      } catch { return null; }
      finally { pending = null; }
    })();
    return pending;
  };
  // The regular loader consumes this very same request, not a second API call.
  window.HAKI_INITIAL_CATALOG = window.HAKI_FETCH_CATALOG();
})();
