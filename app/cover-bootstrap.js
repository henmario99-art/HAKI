/* HAKI cover bootstrap — never paint a stale cover before live catalog data arrives. */
(() => {
  const hero = document.getElementById('heroImage');
  window.HAKI_COVER_WAITING_LIVE = true;

  if (hero) {
    hero.removeAttribute('src');
    hero.removeAttribute('srcset');
    hero.style.visibility = 'hidden';
    hero.fetchPriority = 'high';
    hero.decoding = 'async';
  }

  let warmed = false;
  function warmNextImages() {
    if (warmed || window.HAKI_COVER_WAITING_LIVE || !hero?.complete || !hero.naturalWidth) return;
    warmed = true;
    const config = window.HAKI_CONFIG || {};
    const products = window.HAKI_PRODUCTOS || [];
    const candidates = [];
    for (const collection of (Array.isArray(config.colecciones) ? config.colecciones : [])) {
      if (collection?.imagen) candidates.push(collection.imagen);
    }
    for (const product of products) {
      if (product?.novedad === true && product.imagen) candidates.push(product.imagen);
      if (candidates.length >= 10) break;
    }
    for (const source of [...new Set(candidates)].slice(0, 8)) {
      const img = new Image();
      img.decoding = 'async';
      img.fetchPriority = 'low';
      img.src = typeof window.hakiImage === 'function' ? window.hakiImage(source, 560) : source;
    }
  }

  hero?.addEventListener('load', () => {
    if ('requestIdleCallback' in window) requestIdleCallback(warmNextImages);
    else setTimeout(warmNextImages, 250);
  });

  window.addEventListener('haki:catalog-updated', event => {
    if (event?.detail?.live === false) return;
    if ('requestIdleCallback' in window) requestIdleCallback(warmNextImages, { timeout:1200 });
    else setTimeout(warmNextImages, 250);
  });
})();
