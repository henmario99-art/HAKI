(() => {
  const REMOTE = /^(?:https?:|data:|blob:)/i;
  const clean = value => String(value || '').replace(/^\/?(?:\.\/)?/, '');
  const rootAsset = value => {
    const url = String(value || '');
    if (!url) return '/images/producto.svg';
    if (REMOTE.test(url)) return url;
    return '/' + clean(url);
  };
  const BROKEN_VARIANTS = new Set([
    'images/optimized/2e82ffe16ce2-800.webp',
    'images/optimized/06de4e28143e-800.webp'
  ]);
  const itemsFor = url => ((window.HAKI_IMAGES || {})[url] || [])
    .filter(item => item && item.src && Number(item.width) > 0 && !BROKEN_VARIANTS.has(item.src));
  const pickItem = (items, size) =>
    items.find(item => item.width >= size) || items.at(-1);
  const netlifyImage = (url, size = 800) => {
    const width = Math.max(240, Math.min(1600, Math.round(Number(size) || 800)));
    return '/.netlify/images?url=' + encodeURIComponent('/' + clean(url)) +
      '&w=' + width + '&q=76';
  };

  window.hakiImage = (url = '', size = 800) => {
    const items = itemsFor(url);
    if (items.length) return rootAsset(pickItem(items, size).src);
    if (!url) return '/images/producto.svg';
    if (REMOTE.test(String(url))) return String(url);
    if (/\.svg(?:[?#]|$)/i.test(String(url))) return rootAsset(url);
    return netlifyImage(url, size);
  };

  window.hakiSrcset = url => {
    const items = itemsFor(url);
    if (items.length) {
      return items.map(item => rootAsset(item.src) + ' ' + item.width + 'w').join(', ');
    }
    if (!url || REMOTE.test(String(url)) || /\.svg(?:[?#]|$)/i.test(String(url))) return '';
    return [360, 560, 800, 1200]
      .map(width => netlifyImage(url, width) + ' ' + width + 'w')
      .join(', ');
  };

  const normalize = img => {
    const src = img.getAttribute('src');
    if (!src || REMOTE.test(src) || src.startsWith('/') ||
        src.startsWith('http://127.0.0.1') || src.startsWith('http://localhost')) return;
    if (/^images\//i.test(src)) img.src = rootAsset(src);
  };

  new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('img')) normalize(node);
        node.querySelectorAll?.('img').forEach(normalize);
      });
    }
  }).observe(document.documentElement, {subtree:true, childList:true});

  document.documentElement.classList.add('doufu-app');
})();