/* HAKI v31 — fast installed startup using optimized manifest images. */
(() => {
  const hero = document.getElementById('heroImage');
  const config = window.HAKI_CONFIG || {};
  const products = window.HAKI_PRODUCTOS || [];
  const manifest = window.HAKI_IMAGES || {};
  const remote = /^(?:https?:|data:|blob:)/i;
  const clean = value => String(value || '').replace(/^\/?(?:\.\/)?/, '');
  const root = value => remote.test(String(value || ''))
    ? String(value || '')
    : '/' + clean(value);

  const choose = (source, target = 1280) => {
    const items = (manifest[source] || []).filter(item => item?.src && item?.width);
    if (items.length) {
      const item = items.find(item => item.width >= target) || items.at(-1);
      return root(item.src);
    }
    if (!source) return '';
    if (remote.test(source)) return source;
    if (/\.svg(?:[?#]|$)/i.test(source)) return root(source);
    return '/.netlify/images?url=' + encodeURIComponent('/' + clean(source)) +
      '&w=' + Math.max(360, Math.min(1280, target)) + '&q=76';
  };

  const source = config.portada || config.portadaRespaldo || '';
  const target = matchMedia('(max-width:800px)').matches ? 1280 : 1920;
  const heroSrc = choose(source, target);

  if (hero && heroSrc) {
    hero.src = heroSrc;
    const items = (manifest[source] || []).filter(item => item?.src && item?.width);
    if (items.length) {
      hero.srcset = items.map(item => root(item.src) + ' ' + item.width + 'w').join(', ');
      hero.sizes = '100vw';
    }
    hero.fetchPriority = 'high';
    hero.decoding = 'async';
  }

  const warmNext = () => {
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
      img.src = choose(source, 560);
    }
  };

  const scheduleWarm = () => {
    const run = () => setTimeout(warmNext, 250);
    if ('requestIdleCallback' in window) requestIdleCallback(run, {timeout:1200});
    else run();
  };

  if (hero?.complete) scheduleWarm();
  else hero?.addEventListener('load', scheduleWarm, {once:true});
})();