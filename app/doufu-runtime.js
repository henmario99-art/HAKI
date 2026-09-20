(() => {
  const CDN = 'https://cdn.jsdelivr.net/gh/henmario99-art/HAKI@main/';
  const REMOTE = /^(?:https?:|data:|blob:)/i;
  const clean = value => String(value || '').replace(/^\/?(?:\.\/)?/, '');
  const asset = value => {
    const url = String(value || '');
    if (!url) return CDN + 'images/producto.svg';
    if (REMOTE.test(url)) return url;
    const local = clean(url);
    return CDN + local;
  };

  // The published catalog uses Netlify Image CDN for local raster images.
  // Inside Doufu we resolve exactly the same repository image directly.
  window.hakiImage = (url = '', size = 800) => asset(url);
  window.hakiSrcset = url => {
    if (!url || REMOTE.test(String(url)) || /\.svg(?:[?#]|$)/i.test(String(url))) return '';
    const src = asset(url);
    return `${src} 400w, ${src} 800w, ${src} 1200w`;
  };

  // Fallback for any existing Netlify-image URL produced before this adapter runs.
  document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    try {
      const u = new URL(img.currentSrc || img.src, location.href);
      if (u.pathname === '/.netlify/images') {
        const original = u.searchParams.get('url');
        if (original) img.src = asset(original);
      }
    } catch {}
  }, true);

  // Make static local image references that may be inserted by other scripts remote-safe.
  const fixImage = img => {
    const src = img.getAttribute('src');
    if (src && !REMOTE.test(src) && !src.startsWith('http://127.0.0.1') && !src.startsWith('http://localhost')) {
      img.src = asset(src);
    }
  };
  new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches?.('img')) fixImage(node);
        node.querySelectorAll?.('img').forEach(fixImage);
      });
    }
  }).observe(document.documentElement, {subtree:true, childList:true});

  // Doufu's WebView occupies the full screen; reserve the iPhone status-bar safe area.
  document.documentElement.classList.add('doufu-app');
})();